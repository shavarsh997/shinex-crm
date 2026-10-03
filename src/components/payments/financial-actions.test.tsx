// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BudgetAdjustmentDialog } from "@/components/budget/budget-adjustment-dialog";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { ExpenseList, type ExpenseView } from "@/components/expenses/expense-list";
import { PaymentDialog } from "./payment-dialog";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/i18n/provider", () => ({ useTranslations: () => ({ locale: "ru", t: (key: string) => key }) }));

const payment = { id: "payment-1", amount: "100", date: "2026-10-03", notes: null };
const expense: ExpenseView = { id: "expense-1", type: "MATERIAL", title: "Materials", amount: "100", date: "2026-10-03", description: null, employeeName: null, employeeId: null, vendorName: null, notes: null };
const fetchMock = vi.fn();

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}

function delayMutation() {
  const response = deferredResponse();
  fetchMock.mockImplementation((url: string) => url === "/api/confirmation-challenge"
    ? Promise.resolve(Response.json({ phrase: "123" }))
    : response.promise);
  return response;
}

function mutations() {
  return fetchMock.mock.calls.filter(([url]) => url !== "/api/confirmation-challenge");
}

function submitTwice(form: HTMLFormElement) {
  act(() => {
    fireEvent.submit(form);
    fireEvent.submit(form);
  });
}

async function openDialog(view: ReactNode, trigger?: string) {
  render(view);
  if (trigger) await userEvent.click(screen.getByRole("button", { name: trigger }));
  const dialog = screen.getByRole("dialog");
  return dialog.querySelector("form")!;
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.spyOn(window, "prompt").mockReturnValue("123");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(window, "alert").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("financial form loading", () => {
  it.each([
    { name: "payment", view: <PaymentDialog projectId="project-1" />, trigger: "payment.add", endpoint: "/api/projects/project-1/payments" },
    { name: "expense", view: <ExpenseDialog projectId="project-1" employees={[]} />, trigger: "expense.add", endpoint: "/api/projects/project-1/expenses" },
    { name: "budget adjustment", view: <BudgetAdjustmentDialog projectId="project-1" />, trigger: "budget.adjust", endpoint: "/api/projects/project-1/budget-adjustments" },
  ])("blocks duplicate $name submissions, shows loading, and retries after failure", async ({ view, trigger, endpoint }) => {
    const response = delayMutation();
    const form = await openDialog(view, trigger);
    const save = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    submitTwice(form);
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(mutations()[0][0]).toBe(endpoint);
    expect(save.disabled).toBe(true);
    expect(save.getAttribute("aria-busy")).toBe("true");
    expect(save.querySelector(".animate-spin")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("dialog")).toBeTruthy();

    await act(async () => { response.resolve(Response.json({ error: { message: "Try again" } }, { status: 500 })); });
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Try again");
    await waitFor(() => expect(save.disabled).toBe(false));
    expect(save.getAttribute("aria-busy")).not.toBe("true");
    fetchMock.mockImplementation(async (url: string) => url === "/api/confirmation-challenge" ? Response.json({ phrase: "123" }) : Response.json({}));
    fireEvent.submit(form);
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(mutations()).toHaveLength(2);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it.each([
    { name: "payment", view: <PaymentDialog projectId="project-1" payment={payment} />, trigger: "payment.edit" },
    { name: "expense", view: <ExpenseDialog projectId="project-1" employees={[]} expense={expense} open />, trigger: undefined },
    { name: "budget adjustment", view: <BudgetAdjustmentDialog projectId="project-1" />, trigger: "budget.adjust" },
  ])("allows retry after cancelling $name confirmation", async ({ view, trigger }) => {
    const response = delayMutation();
    vi.mocked(window.prompt).mockReturnValueOnce(null);
    const form = await openDialog(view, trigger);
    fireEvent.submit(form);
    await waitFor(() => expect(window.prompt).toHaveBeenCalledOnce());
    const save = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    await waitFor(() => expect(save.disabled).toBe(false));
    expect(mutations()).toHaveLength(0);
    submitTwice(form);
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(window.prompt).toHaveBeenCalledTimes(2);
    await act(async () => { response.resolve(Response.json({})); });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it("locks payment deletion while a save is awaiting confirmation or a response", async () => {
    const response = delayMutation();
    const form = await openDialog(<PaymentDialog projectId="project-1" payment={payment} />, "payment.edit");
    const remove = screen.getByRole<HTMLButtonElement>("button", { name: "common.delete" });
    act(() => {
      fireEvent.submit(form);
      fireEvent.click(remove);
    });
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(mutations()[0][1]).toMatchObject({ method: "PATCH" });
    expect(window.confirm).not.toHaveBeenCalled();
    expect(remove.disabled).toBe(true);
    await act(async () => { response.resolve(Response.json({})); });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it("shows payment deletion loading and blocks a simultaneous form save", async () => {
    const response = delayMutation();
    const form = await openDialog(<PaymentDialog projectId="project-1" payment={payment} />, "payment.edit");
    const remove = screen.getByRole<HTMLButtonElement>("button", { name: "common.delete" });
    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
      fireEvent.submit(form);
    });
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(mutations()[0][1]).toMatchObject({ method: "DELETE" });
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(remove.getAttribute("aria-busy")).toBe("true");
    expect(remove.querySelector(".animate-spin")).toBeTruthy();
    expect(form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    await act(async () => { response.resolve(Response.json({})); });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });
});

describe("expense row deletion", () => {
  function renderExpenses() {
    render(<ExpenseList projectId="project-1" initialExpenses={[expense, { ...expense, id: "expense-2", title: "Fuel" }]} initialPageInfo={{ hasNextPage: false, nextCursor: null }} totalCount={2} canEdit employees={[]} />);
    return screen.getAllByRole<HTMLButtonElement>("button", { name: "common.delete" });
  }

  it("locks all row mutations immediately and shows a spinner only on the deleting row", async () => {
    const response = delayMutation();
    const [first, second] = renderExpenses();
    act(() => {
      fireEvent.click(first);
      fireEvent.click(first);
      fireEvent.click(second);
    });
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(mutations()[0][0]).toBe("/api/expenses/expense-1");
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(first.getAttribute("aria-busy")).toBe("true");
    expect(first.querySelector(".animate-spin")).toBeTruthy();
    expect(second.disabled).toBe(true);
    expect(second.querySelector(".animate-spin")).toBeNull();
    expect(screen.getAllByRole<HTMLButtonElement>("button", { name: "common.edit" }).every((button) => button.disabled)).toBe(true);
    await act(async () => { response.resolve(Response.json({}, { status: 500 })); });
    await waitFor(() => expect(first.disabled).toBe(false));
    expect(window.alert).toHaveBeenCalledOnce();
    fetchMock.mockImplementation(async (url: string) => url === "/api/confirmation-challenge" ? Response.json({ phrase: "123" }) : Response.json({}));
    fireEvent.click(first);
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(mutations()).toHaveLength(2);
  });

  it("releases the lock after native delete confirmation is cancelled", async () => {
    const response = delayMutation();
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    const [first] = renderExpenses();
    fireEvent.click(first);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(first);
    await waitFor(() => expect(mutations()).toHaveLength(1));
    await act(async () => { response.resolve(Response.json({})); });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });
});
