// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CreateProjectForm } from "./create-project-form";
import { ProjectEditDialog } from "./project-edit-dialog";
import { ProjectSettingsDialog } from "./project-settings-dialog";
import { ProjectMembers } from "./project-members";

const { refresh, push, replace } = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push, replace }) }));
vi.mock("@/i18n/provider", () => ({ useTranslations: () => ({ locale: "ru", t: (key: string, params?: { name?: string }) => params?.name ? `${key} ${params.name}` : key }) }));

const fetchMock = vi.fn();
const project = { id: "project-1", title: "Project", description: null, ownerName: null, ownerPhone: null, ownerEmail: null, ownerNotes: null };
const owner = { id: "owner-1", name: "Owner", email: null };
const member = { id: "member-1", name: "Member", email: null };
const anotherMember = { id: "member-2", name: "Another", email: null };

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

function submitTwice(button: HTMLElement) {
  const form = button.closest("form")!;
  act(() => { fireEvent.submit(form); fireEvent.submit(form); });
}

function expectLoading(button: HTMLElement) {
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(button.getAttribute("aria-busy")).toBe("true");
  expect(button.querySelector(".animate-spin")).toBeTruthy();
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.spyOn(window, "prompt").mockReturnValue("123");
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("project mutation loading", () => {
  it("submits creation once immediately, prevents going back, and allows retry after failure", async () => {
    const request = deferredResponse();
    fetchMock.mockReturnValueOnce(request.promise).mockResolvedValueOnce(Response.json({ project: { id: "new-project" } }));
    render(<CreateProjectForm />);
    fireEvent.change(screen.getByRole("textbox", { name: "form.projectTitle" }), { target: { value: "New project" } });
    fireEvent.click(screen.getByRole("button", { name: "form.continue" }));
    const create = screen.getByRole("button", { name: "project.create" });
    submitTwice(create);
    expect(fetchMock).toHaveBeenCalledOnce();
    expectLoading(create);
    const back = screen.getByRole("button", { name: "form.back" });
    expect((back as HTMLButtonElement).disabled).toBe(true);
    expect(back.querySelector(".animate-spin")).toBeNull();
    await act(async () => { request.resolve(Response.json({ error: { message: "Try again" } }, { status: 500 })); });
    expect(screen.getByRole("alert").textContent).toBe("Try again");
    fireEvent.submit(screen.getByRole("button", { name: "project.create" }).closest("form")!);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/projects/new-project"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("locks editing before the confirmation request and keeps the dialog open until a save finishes", async () => {
    const challenge = deferredResponse();
    const save = deferredResponse();
    fetchMock.mockReturnValueOnce(challenge.promise).mockReturnValueOnce(save.promise);
    render(<ProjectEditDialog project={project} />);
    fireEvent.click(screen.getByRole("button", { name: "project.edit" }));
    const button = screen.getByRole("button", { name: "payment.saveChanges" });
    const close = screen.getByRole("button", { name: "Close" });
    act(() => { fireEvent.submit(button.closest("form")!); fireEvent.submit(button.closest("form")!); fireEvent.click(close); });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expectLoading(button);
    await act(async () => { challenge.resolve(Response.json({ phrase: "123" })); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fireEvent.click(close);
    expect(screen.getByRole("dialog")).toBeTruthy();
    await act(async () => { save.resolve(Response.json({})); });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("releases an edit lock when confirmation is cancelled", async () => {
    vi.mocked(window.prompt).mockReturnValueOnce(null).mockReturnValueOnce("123");
    fetchMock.mockImplementation(async (url: string) => Response.json(url === "/api/confirmation-challenge" ? { phrase: "123" } : {}));
    render(<ProjectEditDialog project={project} />);
    fireEvent.click(screen.getByRole("button", { name: "project.edit" }));
    fireEvent.submit(screen.getByRole("button", { name: "payment.saveChanges" }).closest("form")!);
    await waitFor(() => expect((screen.getByRole("button", { name: "payment.saveChanges" }) as HTMLButtonElement).disabled).toBe(false));
    expect(fetchMock).toHaveBeenCalledOnce();
    fireEvent.submit(screen.getByRole("button", { name: "payment.saveChanges" }).closest("form")!);
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("blocks duplicate and conflicting state changes and releases a cancelled freeze", async () => {
    const request = deferredResponse();
    fetchMock.mockReturnValueOnce(request.promise).mockResolvedValueOnce(Response.json({ phrase: "123" })).mockResolvedValueOnce(Response.json({}));
    vi.mocked(window.prompt).mockReturnValueOnce(null).mockReturnValueOnce("123");
    render(<ProjectSettingsDialog projectId="project-1" status="ACTIVE" completedAt={null} frozenAt={null} canManageProject canHardDelete />);
    fireEvent.click(screen.getByRole("button", { name: "project.settings" }));
    const freeze = screen.getByRole("button", { name: "project.freeze" });
    const complete = screen.getByRole("button", { name: "project.complete" });
    act(() => { fireEvent.click(freeze); fireEvent.click(freeze); fireEvent.click(complete); fireEvent.click(screen.getByRole("button", { name: "Close" })); });
    expect(fetchMock).toHaveBeenCalledOnce();
    expectLoading(screen.getByRole("button", { name: "project.freezing" }));
    expect((complete as HTMLButtonElement).disabled).toBe(true);
    expect(complete.querySelector(".animate-spin")).toBeNull();
    await act(async () => { request.resolve(Response.json({ phrase: "123" })); });
    expect((screen.getByRole("button", { name: "project.freeze" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "project.freeze" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it.each(["complete", "delete"] as const)("protects both the %s challenge and confirmation, including navigation", async (flow) => {
    const challenge = deferredResponse();
    const mutation = deferredResponse();
    fetchMock.mockReturnValueOnce(challenge.promise).mockReturnValueOnce(mutation.promise);
    render(<ProjectSettingsDialog projectId="project-1" status="ACTIVE" completedAt={null} frozenAt={null} canManageProject canHardDelete />);
    fireEvent.click(screen.getByRole("button", { name: "project.settings" }));
    fireEvent.click(screen.getByRole("button", { name: `project.${flow}` }));
    const next = screen.getByRole("button", { name: flow === "complete" ? "Продолжить" : "form.continue" });
    const back = screen.getByRole("button", { name: flow === "complete" ? "Назад" : "form.back" });
    act(() => { fireEvent.click(next); fireEvent.click(next); fireEvent.click(back); fireEvent.click(screen.getByRole("button", { name: "Close" })); });
    expect(fetchMock).toHaveBeenCalledOnce();
    expectLoading(next);
    expect((back as HTMLButtonElement).disabled).toBe(true);
    expect(back.querySelector(".animate-spin")).toBeNull();
    await act(async () => { challenge.resolve(Response.json({ phrase: "123" })); });
    fireEvent.change(screen.getByRole("textbox", { name: "project.enterConfirmationCode" }), { target: { value: "123" } });
    const confirm = screen.getByRole("button", { name: flow === "complete" ? "Завершить проект" : "Удалить безвозвратно" });
    act(() => { fireEvent.click(confirm); fireEvent.click(confirm); fireEvent.click(screen.getByRole("button", { name: "Назад" })); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expectLoading(confirm);
    await act(async () => { mutation.resolve(Response.json({})); });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(refresh).toHaveBeenCalledOnce();
    if (flow === "delete") expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("protects member challenge and mutation submissions and retries with a fresh code", async () => {
    const challenge = deferredResponse();
    const mutation = deferredResponse();
    fetchMock.mockReturnValueOnce(challenge.promise).mockReturnValueOnce(mutation.promise).mockResolvedValueOnce(Response.json({ phrase: "456" })).mockResolvedValueOnce(Response.json({}));
    render(<ProjectMembers projectId="project-1" owner={owner} members={[]} availableUsers={[member]} canManage />);
    fireEvent.click(screen.getByRole("button", { name: "common.add" }));
    const prepare = screen.getByRole("button", { name: "project.grantAccess" });
    submitTwice(prepare);
    expect(fetchMock).toHaveBeenCalledOnce();
    expectLoading(prepare);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    await act(async () => { challenge.resolve(Response.json({ phrase: "123" })); });
    fireEvent.change(screen.getByRole("textbox", { name: "project.enterConfirmationCode" }), { target: { value: "123" } });
    const grant = screen.getByRole("button", { name: "project.grantAccess" });
    submitTwice(grant);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expectLoading(grant);
    expect((screen.getByRole("button", { name: "form.back" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { mutation.resolve(Response.json({ error: { message: "Retry membership" } }, { status: 500 })); });
    expect(screen.getByRole("alert").textContent).toBe("Retry membership");
    fireEvent.submit(screen.getByRole("button", { name: "project.grantAccess" }).closest("form")!);
    await waitFor(() => expect(screen.getByText("456")).toBeTruthy());
    fireEvent.change(screen.getByRole("textbox", { name: "project.enterConfirmationCode" }), { target: { value: "456" } });
    fireEvent.submit(screen.getByRole("button", { name: "project.grantAccess" }).closest("form")!);
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("locks all member mutations before confirmation and animates only the selected removal", async () => {
    const request = deferredResponse();
    fetchMock.mockReturnValueOnce(request.promise).mockResolvedValueOnce(Response.json({}));
    render(<ProjectMembers projectId="project-1" owner={owner} members={[member, anotherMember].map((user) => ({ userId: user.id, role: "EDITOR", user }))} availableUsers={[]} canManage />);
    const remove = screen.getByRole("button", { name: "project.removeMember Member" });
    const otherRemove = screen.getByRole("button", { name: "project.removeMember Another" });
    act(() => { fireEvent.click(remove); fireEvent.click(remove); fireEvent.click(otherRemove); fireEvent.click(screen.getByRole("button", { name: "common.add" })); });
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
    expectLoading(remove);
    expect((otherRemove as HTMLButtonElement).disabled).toBe(true);
    expect(otherRemove.querySelector(".animate-spin")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => { request.resolve(Response.json({ phrase: "123" })); });
    expect(refresh).toHaveBeenCalledOnce();
    expect((otherRemove as HTMLButtonElement).disabled).toBe(false);
  });

  it("allows another removal after cancelling the initial confirmation", async () => {
    vi.mocked(window.confirm).mockReturnValueOnce(false).mockReturnValueOnce(true);
    fetchMock.mockImplementation(async (url: string) => Response.json(url === "/api/confirmation-challenge" ? { phrase: "123" } : {}));
    render(<ProjectMembers projectId="project-1" owner={owner} members={[{ userId: member.id, role: "EDITOR", user: member }]} availableUsers={[]} canManage />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "project.removeMember Member" }));
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "project.removeMember Member" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });
});
