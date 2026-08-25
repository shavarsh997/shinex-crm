import "server-only";

import { prisma } from "@/server/db/prisma";
import { money, recordAudit } from "@/server/shared/audit/log";
import { inProjectTransaction } from "@/server/shared/database/project-lock";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import { createCursorPage, toPrismaCursorPagination, type CursorPaginationInput } from "@/server/shared/pagination";

import { findProjectForEditor, findProjectForUser } from "../projects/projects.repository";
import type { CreateBudgetAdjustmentInput } from "./budget.schema";

export async function getProjectBudgetAdjustmentPage(userId: string, projectId: string, pagination: CursorPaginationInput, isAdmin = false) {
  const project = await findProjectForUser(prisma, projectId, userId, isAdmin);
  if (!project) throw new NotFoundError("Проект");
  const where = { projectId };
  const [adjustments, totalCount] = await Promise.all([
    prisma.budgetAdjustment.findMany({ where, orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }], ...toPrismaCursorPagination(pagination) }),
    prisma.budgetAdjustment.count({ where }),
  ]);
  return { ...createCursorPage(adjustments, pagination.limit), totalCount };
}

export async function addBudgetAdjustment(userId: string, projectId: string, input: CreateBudgetAdjustmentInput, isAdmin = false) {
  return inProjectTransaction(projectId, async (transaction) => {
    const project = await findProjectForEditor(transaction, projectId, userId, isAdmin);
    if (!project) throw new NotFoundError("Проект");
    if (project.status !== "ACTIVE") throw new ConflictError("Нельзя менять бюджет неактивного проекта.");
    const existing = await transaction.budgetAdjustment.findUnique({ where: { clientRequestId: input.clientRequestId } });
    if (existing) {
      if (existing.projectId !== projectId) throw new ConflictError("Ключ операции уже использован для другого изменения бюджета.");
      return existing;
    }
    const availableBudget = project.estimatedAmount - project.spentAmount;
    if (input.type === "DECREASE" && input.amount > availableBudget) {
      throw new ValidationError({ message: "Бюджет нельзя уменьшить ниже уже понесённых расходов." });
    }
    const adjustment = await transaction.budgetAdjustment.create({ data: { ...input, projectId } });
    await transaction.project.update({ where: { id: projectId }, data: { estimatedAmount: { [input.type === "INCREASE" ? "increment" : "decrement"]: input.amount } } });
    await recordAudit(transaction, { actorId: userId, projectId, entityType: "BUDGET_ADJUSTMENT", entityId: adjustment.id, action: "CREATE", after: { type: adjustment.type, amount: money(adjustment.amount), date: adjustment.date.toISOString(), notes: adjustment.notes } });
    return adjustment;
  });
}
