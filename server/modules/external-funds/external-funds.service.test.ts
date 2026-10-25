import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExternalFundEntry, Prisma } from "@/server/generated/prisma/client";

const { db, projectSummary } = vi.hoisted(() => ({
  db: {
    project: { findFirst: vi.fn(), update: vi.fn() },
    externalFundEntry: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
  projectSummary: vi.fn(),
}));
vi.mock("@/server/db/prisma", () => ({ prisma: db }));
vi.mock("@/server/shared/database/project-lock", () => ({ inProjectTransaction: (_projectId: string, work: (tx: Prisma.TransactionClient) => unknown) => work(db as unknown as Prisma.TransactionClient) }));
vi.mock("../projects/projects.service", () => ({ getUserProjectSummary: projectSummary }));

import { addExternalFundEntry, deleteExternalFundEntry, getProjectExternalFunds, restoreExternalFundEntry, updateExternalFundEntry } from "./external-funds.service";
import { createExternalFundEntrySchema, updateExternalFundEntrySchema } from "./external-funds.schema";

const input = createExternalFundEntrySchema.parse({ type: "EXPENSE", category: "MATERIAL", title: "Плитка", amount: "200000", date: "2026-10-25", clientRequestId: "6dd80b2d-43e4-4f87-845c-60a1dd185855" });
const entry: ExternalFundEntry = { ...input, id: "entry-1", projectId: "project-1", deletedAt: null, createdAt: new Date(), updatedAt: new Date() };
const mutations = [
  () => addExternalFundEntry("owner", "project-1", input),
  () => updateExternalFundEntry("owner", "project-1", entry.id, input),
  () => deleteExternalFundEntry("owner", "project-1", entry.id),
  () => restoreExternalFundEntry("owner", "project-1", entry.id),
];

beforeEach(() => {
  vi.resetAllMocks();
  db.project.findFirst.mockResolvedValue({ id: "project-1", status: "ACTIVE" });
  db.externalFundEntry.findFirst.mockResolvedValue(entry);
  db.externalFundEntry.create.mockResolvedValue(entry);
  db.externalFundEntry.update.mockImplementation(async ({ data }) => ({ ...entry, ...data }));
});

describe("separate project ledger", () => {
  it("audits creation, editing, deletion and restoration without changing construction budget counters", async () => {
    await mutations[0]();
    const updated = await updateExternalFundEntry("owner", "project-1", entry.id, updateExternalFundEntrySchema.parse({ type: "INCOME", title: "Возмещение", amount: "100000", date: "2026-10-25" }));
    expect(updated).toMatchObject({ type: "INCOME", amount: 100000n, category: null });
    await mutations[2]();
    await mutations[3]();
    expect(db.auditLog.create.mock.calls.map(([{ data }]) => data.action)).toEqual(["CREATE", "UPDATE", "DELETE", "RESTORE"]);
    expect(db.project.update).toHaveBeenCalledTimes(4);
    for (const [{ data }] of db.project.update.mock.calls) {
      expect(data).toEqual({ updatedAt: expect.any(Date) });
    }
    expect(db.externalFundEntry.findFirst).toHaveBeenLastCalledWith({ where: { id: entry.id, projectId: "project-1", deletedAt: { not: null } } });
  });

  it("deduplicates retries and rejects key reuse with different data or deleted entries", async () => {
    db.externalFundEntry.findUnique.mockResolvedValue(entry);
    expect(await mutations[0]()).toEqual(entry);
    expect(db.externalFundEntry.create).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
    await expect(addExternalFundEntry("owner", "project-1", { ...input, amount: 1n })).rejects.toThrow("Ключ операции уже использован");
    db.externalFundEntry.findUnique.mockResolvedValue({ ...entry, deletedAt: new Date() });
    await expect(mutations[0]()).rejects.toThrow("Ключ операции уже использован");
  });

  it.each(["FROZEN", "COMPLETED"])("blocks every mutation on %s projects", async (status) => {
    db.project.findFirst.mockResolvedValue({ status });
    for (const mutate of mutations) await expect(mutate()).rejects.toThrow("только в активном проекте");
    expect(db.externalFundEntry.create).not.toHaveBeenCalled();
    expect(db.externalFundEntry.update).not.toHaveBeenCalled();
  });

  it("requires an owner, editor membership or administrator, and excludes deleted projects/members", async () => {
    db.project.findFirst.mockResolvedValue(null);
    for (const mutate of mutations) await expect(mutate()).rejects.toThrow();
    expect(db.project.findFirst).toHaveBeenCalledWith({ where: { id: "project-1", deletedAt: null, OR: [{ userId: "owner" }, { members: { some: { userId: "owner", role: "EDITOR", deletedAt: null } } }] } });
    db.project.findFirst.mockResolvedValue({ status: "ACTIVE" });
    await addExternalFundEntry("admin", "project-1", input, true);
    expect(db.project.findFirst).toHaveBeenLastCalledWith({ where: { id: "project-1", deletedAt: null } });
  });

  it("cannot edit, delete or restore an entry from another project", async () => {
    db.externalFundEntry.findFirst.mockResolvedValue(null);
    for (const mutate of mutations.slice(1)) await expect(mutate()).rejects.toThrow();
    expect(db.externalFundEntry.update).not.toHaveBeenCalled();
  });

  it("checks project visibility before reading the ledger", async () => {
    projectSummary.mockRejectedValueOnce(new Error("No access"));
    await expect(getProjectExternalFunds("stranger", "MEMBER", "project-1")).rejects.toThrow("No access");
    expect(db.externalFundEntry.findMany).not.toHaveBeenCalled();
    projectSummary.mockResolvedValue({ id: "project-1", canEdit: false });
    db.externalFundEntry.findMany.mockResolvedValue([entry, { ...entry, id: "deleted", deletedAt: new Date() }]);
    const result = await getProjectExternalFunds("viewer", "MEMBER", "project-1");
    expect(result.totals).toEqual({ received: 0n, spent: entry.amount, balance: -entry.amount });
    expect(result.project.canEdit).toBe(false);
  });
});
