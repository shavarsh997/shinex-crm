// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExternalFundEntryDialog } from "./external-fund-entry-dialog";
import { ExternalFundsLedger } from "./external-funds-ledger";
import type { ExternalFundEntryView } from "@/lib/external-funds";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/i18n/provider", () => ({ useTranslations: () => ({ locale: "ru", t: (key: string) => key }) }));
const fetchMock = vi.fn();
const entry: ExternalFundEntryView = { id: "entry-1", type: "EXPENSE", category: "MATERIAL", title: "Плитка", amount: "150000", date: "2026-10-25", counterparty: "Магазин", notes: null, deletedAt: null };

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset().mockImplementation(async () => Response.json({}));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.spyOn(window, "prompt").mockReturnValue("123");
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("external fund entry form", () => {
  it("preserves fields and request key after failure, blocks double submission, and uses a new key for the next purchase", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((done) => { resolve = done; }));
    render(<ExternalFundEntryDialog projectId="project-1" initialType="EXPENSE" />);
    await userEvent.click(screen.getByRole("button", { name: "externalFunds.addExpense" }));
    await userEvent.type(screen.getByLabelText("common.amountAmd"), "150000");
    await userEvent.type(screen.getByLabelText("externalFunds.purpose"), "Плитка");
    const form = screen.getByRole("dialog").querySelector("form")!;
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    expect(fetchMock).toHaveBeenCalledOnce();
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(firstBody).toMatchObject({ type: "EXPENSE", category: "MATERIAL", title: "Плитка", amount: "150000" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/projects/project-1/external-funds");
    await act(async () => { resolve(Response.json({ error: { message: "Retry" } }, { status: 500 })); });
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Retry");
    expect(screen.getByLabelText("externalFunds.purpose")).toHaveProperty("value", "Плитка");
    fireEvent.submit(form);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).clientRequestId).toBe(firstBody.clientRequestId);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await userEvent.click(screen.getByRole("button", { name: "externalFunds.addExpense" }));
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).clientRequestId).not.toBe(firstBody.clientRequestId);
  });

  it("does not mutate on cancelled confirmation, then submits an edit with the confirmation header", async () => {
    fetchMock.mockImplementation(async (url: string) => Response.json(url === "/api/confirmation-challenge" ? { phrase: "123" } : {}));
    vi.mocked(window.prompt).mockReturnValueOnce(null);
    render(<ExternalFundEntryDialog projectId="project-1" entry={entry} />);
    await userEvent.click(screen.getByRole("button", { name: "externalFunds.edit" }));
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() => expect(window.prompt).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("button", { name: "common.save" })).toHaveProperty("disabled", false));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.submit(form);
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[2]).toMatchObject(["/api/projects/project-1/external-funds/entry-1", { method: "PATCH", headers: { "X-Shinex-Confirmation-Code": "123" } }]);
  });
});

describe("external funds history", () => {
  const entries: ExternalFundEntryView[] = [entry, { ...entry, id: "income", type: "INCOME", category: null, title: "От заказчика" }, { ...entry, id: "deleted", title: "Удалённая покупка", deletedAt: "2026-10-25" }];

  it("filters income, purchases and deleted records and keeps viewers read only", async () => {
    render(<ExternalFundsLedger projectId="project-1" entries={entries} canEdit={false} />);
    expect(screen.getByText("Плитка")).toBeTruthy();
    expect(screen.queryByText("Удалённая покупка")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    await userEvent.selectOptions(screen.getByRole("combobox"), "INCOME");
    expect(screen.queryByText("Плитка")).toBeNull();
    expect(screen.getByText("От заказчика")).toBeTruthy();
    await userEvent.selectOptions(screen.getByRole("combobox"), "DELETED");
    expect(screen.getByText("Удалённая покупка")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("restores a deleted entry with confirmation and refreshes its totals", async () => {
    fetchMock.mockImplementation(async (url: string) => Response.json(url === "/api/confirmation-challenge" ? { phrase: "123" } : {}));
    render(<ExternalFundsLedger projectId="project-1" entries={entries} canEdit />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "DELETED");
    await userEvent.click(screen.getByRole("button", { name: "externalFunds.restore" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[1]).toMatchObject(["/api/projects/project-1/external-funds/deleted/restore", { method: "POST", headers: { "X-Shinex-Confirmation-Code": "123" } }]);
  });
});
