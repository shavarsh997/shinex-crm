// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/i18n/provider";
import { ConfirmationGuard } from "@/components/security/confirmation-guard";
import { ProjectMembers } from "./project-members";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const owner = { id: "owner-1", name: "Владелец", email: null };
const member = { id: "member-1", name: "Участник", email: null };
const fetchMock = vi.fn();
const promptMock = vi.fn();

function membersView(availableUsers = [member]) {
  return <LocaleProvider locale="ru"><ConfirmationGuard /><ProjectMembers projectId="project-1" owner={owner} members={[]} availableUsers={availableUsers} canManage /></LocaleProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.spyOn(window, "prompt").mockImplementation(promptMock);
  promptMock.mockReturnValue(null); // A suppressed browser prompt must not silently cancel adding a member.
  fetchMock.mockImplementation(async (url: string) => url === "/api/confirmation-challenge"
    ? Response.json({ phrase: "123" })
    : Response.json({ member }, { status: 201 }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function openConfirmation() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Добавить" }));
  await user.click(screen.getByRole("button", { name: "Выдать доступ" }));
  return user;
}

describe("adding a project member", () => {
  it("shows an in-app code field even when browser prompts are suppressed", async () => {
    render(membersView());
    await openConfirmation();
    expect(await screen.findByRole("textbox", { name: "Введите три цифры кода" })).toBeTruthy();
    expect(screen.getByText("123")).toBeTruthy();
    expect(promptMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends the chosen member only after the correct three-digit code is typed", async () => {
    render(membersView());
    const user = await openConfirmation();
    const input = await screen.findByRole("textbox", { name: "Введите три цифры кода" });
    const confirm = screen.getByRole("button", { name: "Выдать доступ" });
    await user.type(input, "456");
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.clear(input);
    await user.type(input, "123");
    await user.click(confirm);
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenLastCalledWith("/api/projects/project-1/members", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "X-Shinex-Confirmation-Code": "123" }),
      body: JSON.stringify({ userId: "member-1", role: "EDITOR" }),
    }));
  });

  it("uses the visible selection when the initially empty user list is refreshed", async () => {
    const { rerender } = render(membersView([]));
    rerender(membersView());
    await openConfirmation();
    expect(await screen.findByRole("textbox", { name: "Введите три цифры кода" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns to selection without adding a member and resets the previous code", async () => {
    render(membersView());
    const user = await openConfirmation();
    const input = await screen.findByRole("textbox", { name: "Введите три цифры кода" });
    await user.type(input, "12");
    await user.click(screen.getByRole("button", { name: "Назад" }));
    expect(screen.getByRole("combobox")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Выдать доступ" }));
    expect((await screen.findByRole("textbox", { name: "Введите три цифры кода" }) as HTMLInputElement).value).toBe("");
  });

  it("shows challenge errors instead of silently stopping", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: { message: "Не удалось выдать код" } }, { status: 500 }));
    render(membersView());
    await openConfirmation();
    expect((await screen.findByRole("alert")).textContent).toBe("Не удалось выдать код");
    expect(promptMock).not.toHaveBeenCalled();
  });

  it("confirms the currently visible user after a stale selection disappears", async () => {
    const previousMember = { ...member, id: "previous-member", name: "Другой участник" };
    const { rerender } = render(membersView([previousMember]));
    rerender(membersView());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Добавить" }));
    await user.click(screen.getByRole("button", { name: "Просмотр Видит данные без изменений" }));
    await user.click(screen.getByRole("button", { name: "Выдать доступ" }));
    await user.type(await screen.findByRole("textbox", { name: "Введите три цифры кода" }), "123");
    await user.click(screen.getByRole("button", { name: "Выдать доступ" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenLastCalledWith("/api/projects/project-1/members", expect.objectContaining({
      body: JSON.stringify({ userId: "member-1", role: "VIEWER" }),
    }));
    expect(promptMock).not.toHaveBeenCalled();
  });

  it("displays the server's confirmation error and allows requesting a new code", async () => {
    fetchMock.mockImplementation(async (url: string) => url === "/api/confirmation-challenge"
      ? Response.json({ phrase: "123" })
      : Response.json({ error: { message: "The request data is invalid.", details: [{ message: "Код подтверждения истёк." }] } }, { status: 400 }));
    render(membersView());
    const user = await openConfirmation();
    await user.type(await screen.findByRole("textbox", { name: "Введите три цифры кода" }), "123");
    await user.click(screen.getByRole("button", { name: "Выдать доступ" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Код подтверждения истёк.");
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Выдать доступ" }));
    expect((await screen.findByRole("textbox", { name: "Введите три цифры кода" }) as HTMLInputElement).value).toBe("");
  });

  it("requests a fresh code before retrying a failed member mutation", async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(Response.json({ phrase: "123" }))
      .mockResolvedValueOnce(Response.json({ error: { message: "Ошибка сохранения" } }, { status: 500 }))
      .mockResolvedValueOnce(Response.json({ phrase: "456" }))
      .mockResolvedValueOnce(Response.json({ member }, { status: 201 }));
    render(membersView());
    const user = await openConfirmation();
    await user.type(await screen.findByRole("textbox", { name: "Введите три цифры кода" }), "123");
    await user.click(screen.getByRole("button", { name: "Выдать доступ" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Ошибка сохранения");
    expect(screen.getByRole("combobox")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Выдать доступ" }));
    await user.type(await screen.findByRole("textbox", { name: "Введите три цифры кода" }), "456");
    await user.click(screen.getByRole("button", { name: "Выдать доступ" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenLastCalledWith("/api/projects/project-1/members", expect.objectContaining({
      headers: expect.objectContaining({ "X-Shinex-Confirmation-Code": "456" }),
    }));
  });
});
