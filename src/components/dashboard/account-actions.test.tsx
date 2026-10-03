// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/components/auth/login-form";
import { EmployeeDirectory } from "@/components/employees/employee-directory";
import { LocaleProvider } from "@/i18n/provider";
import { AccessManagement } from "./access-management";
import { TelegramIntegrationSync } from "./telegram-integration-sync";

const { refresh, push } = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

const fetchMock = vi.fn();
function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}
const spinnerCount = () => document.querySelectorAll('[data-slot="button-spinner"]').length;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("account mutation loading", () => {
  it("blocks immediate registration resubmission and mode changes until the request settles", async () => {
    const pending = deferredResponse();
    fetchMock.mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    render(<LocaleProvider locale="ru"><LoginForm /></LocaleProvider>);
    await user.click(screen.getByRole("button", { name: "Регистрация" }));
    await user.type(screen.getByLabelText("Имя"), "Новый пользователь");
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Пароль"), "password123");
    const form = screen.getByRole("button", { name: "Создать учётную запись" }).closest("form")!;
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(spinnerCount()).toBe(1);
    expect((screen.getByRole("button", { name: "Войти" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Email") as HTMLInputElement).disabled).toBe(true);
    await act(async () => pending.resolve(Response.json({ error: { message: "Попробуйте снова" } }, { status: 503 })));
    expect((await screen.findByRole("alert")).textContent).toBe("Попробуйте снова");
    expect(spinnerCount()).toBe(0);
    fetchMock.mockResolvedValueOnce(Response.json({ approved: false }));
    await user.click(screen.getByRole("button", { name: "Создать учётную запись" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("status")).toBeTruthy();
  });

  it("keeps employee creation open and disables edits while saving, then allows retry after failure", async () => {
    const pending = deferredResponse();
    fetchMock.mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    render(<LocaleProvider locale="ru"><EmployeeDirectory employees={[]} canCreate /></LocaleProvider>);
    await user.click(screen.getByRole("button", { name: "Добавить работника" }));
    await user.click(screen.getByRole("button", { name: "Создать работника" }));
    expect(fetchMock).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Имя и фамилия"), "Работник Тестовый");
    await user.dblClick(screen.getByRole("button", { name: "Создать работника" }));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(spinnerCount()).toBe(1);
    expect((screen.getByLabelText("Имя и фамилия") as HTMLInputElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    await act(async () => pending.resolve(Response.json({ error: { message: "Ошибка сохранения" } }, { status: 500 })));
    expect((await screen.findByRole("alert")).textContent).toBe("Ошибка сохранения");
    fetchMock.mockResolvedValueOnce(Response.json({ employee: { id: "employee-1" } }));
    await user.click(screen.getByRole("button", { name: "Создать работника" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("locks all access rows but animates only the chosen action, and recovers after a save error", async () => {
    const pending = deferredResponse();
    fetchMock.mockImplementation((url: string) => url === "/api/confirmation-challenge"
      ? Promise.resolve(Response.json({ phrase: "123" })) : pending.promise);
    vi.spyOn(window, "prompt").mockReturnValue("123");
    const user = userEvent.setup();
    const users = ["first", "second"].map((id) => ({
      id, name: id, email: `${id}@example.com`, role: "MEMBER" as const,
      approvalStatus: "PENDING" as const, approvalNote: null, approvedAt: null, createdAt: new Date("2026-01-01"),
    }));
    render(<LocaleProvider locale="ru"><AccessManagement currentUserId="admin" users={users} /></LocaleProvider>);
    const buttons = screen.getAllByRole("button", { name: "Одобрить доступ" });
    act(() => { buttons[0].click(); buttons[1].click(); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(spinnerCount()).toBe(1);
    expect(screen.getAllByRole("button").every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getAllByRole("combobox").every((select) => (select as HTMLSelectElement).disabled)).toBe(true);
    await act(async () => pending.resolve(Response.json({ error: { message: "Ошибка доступа" } }, { status: 500 })));
    expect((await screen.findByRole("alert")).textContent).toBe("Ошибка доступа");
    expect(spinnerCount()).toBe(0);
    expect(screen.getAllByRole("button").every((button) => !(button as HTMLButtonElement).disabled)).toBe(true);
    fetchMock.mockImplementation(async (url: string) => url === "/api/confirmation-challenge"
      ? Response.json({ phrase: "123" }) : Response.json({ user: { ...users[1], approvalStatus: "APPROVED", createdAt: users[1].createdAt.toISOString() } }));
    await user.click(screen.getAllByRole("button", { name: "Одобрить доступ" })[1]);
    expect(await screen.findByRole("button", { name: "Сохранить изменения" })).toBeTruthy();
  });

  it("releases the access lock when confirmation is cancelled", async () => {
    fetchMock.mockImplementation(async () => Response.json({ phrase: "123" }));
    vi.spyOn(window, "prompt").mockReturnValue(null);
    const user = userEvent.setup();
    render(<LocaleProvider locale="ru"><AccessManagement currentUserId="admin" users={[{
      id: "first", name: "first", email: null, role: "MEMBER", approvalStatus: "PENDING",
      approvalNote: null, approvedAt: null, createdAt: new Date("2026-01-01"),
    }]} /></LocaleProvider>);
    await user.click(screen.getByRole("button", { name: "Одобрить доступ" }));
    expect((screen.getByRole("button", { name: "Одобрить доступ" }) as HTMLButtonElement).disabled).toBe(false);
    await user.click(screen.getByRole("button", { name: "Отклонить" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("deduplicates Telegram synchronization and clears its loading state on error", async () => {
    const pending = deferredResponse();
    fetchMock.mockReturnValueOnce(pending.promise);
    render(<TelegramIntegrationSync />);
    const button = screen.getByRole("button", { name: "Синхронизировать Telegram" });
    act(() => { button.click(); button.click(); });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(spinnerCount()).toBe(1);
    await act(async () => pending.resolve(Response.json({ configured: false }, { status: 500 })));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Синхронизировать Telegram" }) as HTMLButtonElement).disabled).toBe(false);
    expect(spinnerCount()).toBe(0);
  });
});
