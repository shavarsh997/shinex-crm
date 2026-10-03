// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/i18n/provider";
import { TaskBoard } from "./task-board";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const fetchMock = vi.fn();
const task = { id: "task-1", title: "Проверить проект", description: null, status: "TODO" as const, project: null };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function showBoard() {
  render(<LocaleProvider locale="ru"><TaskBoard initialActiveTasks={[task]} activeCount={1} archiveCount={0} initialActivePageInfo={{ hasNextPage: false, nextCursor: null }} projects={[]} /></LocaleProvider>);
}

describe("task mutation loading", () => {
  it("shows a spinner and sends only one status update for rapid repeated clicks", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));
    showBoard();
    const button = screen.getByRole("button", { name: "Отметить задачу выполненной" }) as HTMLButtonElement;
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.querySelector('[data-slot="button-spinner"]')).toBeTruthy();
    await act(async () => { finish(Response.json({ error: { message: "Ошибка" } }, { status: 500 })); });
    expect(button.disabled).toBe(false);
    fetchMock.mockResolvedValueOnce(Response.json({ task: { ...task, status: "DONE" } }));
    await userEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("blocks duplicate creation via form submission and unlocks after an error", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));
    showBoard();
    await userEvent.click(screen.getByRole("button", { name: "Добавить" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Задача" }), "Новая задача");
    const button = screen.getByRole("button", { name: "Создать задачу" }) as HTMLButtonElement;
    const form = button.closest("form")!;
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeTruthy();
    await act(async () => { finish(Response.json({ error: { message: "Ошибка сохранения" } }, { status: 500 })); });
    expect(button.disabled).toBe(false);
    expect((await screen.findByRole("alert")).textContent).toBe("Ошибка сохранения");
    await userEvent.clear(screen.getByRole("textbox", { name: "Задача" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Задача" }), "Новая задача");
    fetchMock.mockResolvedValueOnce(Response.json({ task }));
    await userEvent.click(button);
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it("locks delete and save together until deletion finishes", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));
    showBoard();
    await userEvent.click(screen.getByRole("button", { name: "Открыть задачу" }));
    const remove = screen.getByRole("button", { name: "Удалить" }) as HTMLButtonElement;
    const save = screen.getByRole("button", { name: "Сохранить задачу" }) as HTMLButtonElement;
    act(() => { fireEvent.click(remove); fireEvent.submit(save.closest("form")!); fireEvent.click(remove); });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(remove.disabled).toBe(true);
    expect(save.disabled).toBe(true);
    expect(remove.getAttribute("aria-busy")).toBe("true");
    await act(async () => { finish(new Response(null, { status: 204 })); });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it("disables status choices while an edited task is being saved", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));
    showBoard();
    await userEvent.click(screen.getByRole("button", { name: "Открыть задачу" }));
    const save = screen.getByRole("button", { name: "Сохранить задачу" }) as HTMLButtonElement;
    const choices = ["Новая", "В работе", "Выполнена"].map((name) => screen.getByRole("button", { name }) as HTMLButtonElement);
    act(() => { fireEvent.submit(save.closest("form")!); fireEvent.submit(save.closest("form")!); });
    await waitFor(() => expect(save.disabled).toBe(true));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(choices.every((button) => button.disabled)).toBe(true);
    expect(choices.every((button) => !button.querySelector('[data-slot="button-spinner"]'))).toBe(true);
    await act(async () => { finish(Response.json({ task })); });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });
});
