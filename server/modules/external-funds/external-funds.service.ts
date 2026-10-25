import "server-only";

import { prisma } from "@/server/db/prisma";
import type { ExternalFundEntry, Prisma } from "@/server/generated/prisma/client";
import { summarizeExternalFunds } from "@/lib/external-funds";
import { recordAudit } from "@/server/shared/audit/log";
import { inProjectTransaction } from "@/server/shared/database/project-lock";
import { ConflictError, NotFoundError } from "@/server/shared/errors";
import { findProjectForEditor } from "../projects/projects.repository";
import { getUserProjectSummary } from "../projects/projects.service";
import type { CreateExternalFundEntryInput, UpdateExternalFundEntryInput } from "./external-funds.schema";

export async function getProjectExternalFunds(userId: string, role: string, projectId: string) {
  const project = await getUserProjectSummary(userId, role, projectId);
  const entries = await prisma.externalFundEntry.findMany({
    where: { projectId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
  });
  return { project, entries, totals: summarizeExternalFunds(entries) };
}

function withEditableProject<T>(userId: string, projectId: string, isAdmin: boolean, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return inProjectTransaction(projectId, async (tx) => {
    const project = await findProjectForEditor(tx, projectId, userId, isAdmin);
    if (!project) throw new NotFoundError("Проект");
    if (project.status !== "ACTIVE") throw new ConflictError("Сторонние средства можно изменять только в активном проекте.");
    return work(tx);
  });
}

function auditEntry(entry: ExternalFundEntry) {
  return { type: entry.type, category: entry.category, title: entry.title, amount: entry.amount.toString(), date: entry.date.toISOString(), counterparty: entry.counterparty, notes: entry.notes };
}

async function auditChange(tx: Prisma.TransactionClient, actorId: string, entry: ExternalFundEntry, action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE", before?: ExternalFundEntry) {
  // Touch recency only; construction budget counters belong to their own ledger.
  await tx.project.update({ where: { id: entry.projectId }, data: { updatedAt: new Date() } });
  await recordAudit(tx, {
    actorId, projectId: entry.projectId, entityType: "EXTERNAL_FUND_ENTRY", entityId: entry.id, action,
    ...(before ? { before: auditEntry(before) } : {}),
    ...(action !== "DELETE" ? { after: auditEntry(entry) } : {}),
  });
}

export function addExternalFundEntry(userId: string, projectId: string, input: CreateExternalFundEntryInput, isAdmin = false) {
  return withEditableProject(userId, projectId, isAdmin, async (tx) => {
    const existing = await tx.externalFundEntry.findUnique({ where: { projectId_clientRequestId: { projectId, clientRequestId: input.clientRequestId } } });
    if (existing) {
      if (existing.deletedAt || existing.type !== input.type || existing.category !== input.category || existing.title !== input.title || existing.amount !== input.amount || existing.date.getTime() !== input.date.getTime() || existing.counterparty !== input.counterparty || existing.notes !== input.notes) {
        throw new ConflictError("Ключ операции уже использован. Обновите страницу перед созданием новой операции.");
      }
      return existing;
    }
    const entry = await tx.externalFundEntry.create({ data: { ...input, projectId } });
    await auditChange(tx, userId, entry, "CREATE");
    return entry;
  });
}

export function updateExternalFundEntry(userId: string, projectId: string, entryId: string, input: UpdateExternalFundEntryInput, isAdmin = false) {
  return withEditableProject(userId, projectId, isAdmin, async (tx) => {
    const entry = await tx.externalFundEntry.findFirst({ where: { id: entryId, projectId, deletedAt: null } });
    if (!entry) throw new NotFoundError("Операция");
    const updated = await tx.externalFundEntry.update({ where: { id: entryId }, data: input });
    await auditChange(tx, userId, updated, "UPDATE", entry);
    return updated;
  });
}

export function deleteExternalFundEntry(userId: string, projectId: string, entryId: string, isAdmin = false) {
  return withEditableProject(userId, projectId, isAdmin, async (tx) => {
    const entry = await tx.externalFundEntry.findFirst({ where: { id: entryId, projectId, deletedAt: null } });
    if (!entry) throw new NotFoundError("Операция");
    const deleted = await tx.externalFundEntry.update({ where: { id: entryId }, data: { deletedAt: new Date() } });
    await auditChange(tx, userId, deleted, "DELETE", entry);
  });
}

export function restoreExternalFundEntry(userId: string, projectId: string, entryId: string, isAdmin = false) {
  return withEditableProject(userId, projectId, isAdmin, async (tx) => {
    const entry = await tx.externalFundEntry.findFirst({ where: { id: entryId, projectId, deletedAt: { not: null } } });
    if (!entry) throw new NotFoundError("Удалённая операция");
    const restored = await tx.externalFundEntry.update({ where: { id: entryId }, data: { deletedAt: null } });
    await auditChange(tx, userId, restored, "RESTORE");
    return restored;
  });
}
