import "server-only";

import { prisma } from "@/server/db/prisma";
import { ExpenseType, type Prisma } from "@/server/generated/prisma/client";
import { notifyTelegramAboutPayout } from "@/server/modules/telegram/telegram.service";
import { money, recordAudit } from "@/server/shared/audit/log";
import { inProjectTransaction } from "@/server/shared/database/project-lock";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import { createCursorPage, toPrismaCursorPagination, type CursorPaginationInput } from "@/server/shared/pagination";

import { findProjectForEditor, findProjectForUser } from "../projects/projects.repository";
import type { CreateExpenseInput, UpdateExpenseInput } from "./expenses.schema";
import { changeProjectSpentAmount, createExpense, deleteExpense, findDeletedExpenseForUser, findExpenseForUser, updateExpense } from "./expenses.repository";

export const expenseListSorts = ["newest", "oldest", "highest", "lowest"] as const;
export type ExpenseListSort = (typeof expenseListSorts)[number];

const expenseOrderBy: Record<ExpenseListSort, Prisma.ExpenseOrderByWithRelationInput[]> = {
  newest: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
  oldest: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  highest: [{ amount: "desc" }, { id: "desc" }],
  lowest: [{ amount: "asc" }, { id: "asc" }],
};

function toAuditExpense(expense: { type: string; title: string; amount: bigint; date: Date; description: string | null; employeeName: string | null; vendorName: string | null; notes: string | null }) {
  return { type: expense.type, title: expense.title, amount: money(expense.amount), date: expense.date.toISOString(), description: expense.description, employeeName: expense.employeeName, vendorName: expense.vendorName, notes: expense.notes };
}

function normalizeExpenseUpdate(expense: NonNullable<Awaited<ReturnType<typeof findExpenseForUser>>>, input: UpdateExpenseInput) {
  const type = input.type ?? expense.type;
  const employeeName = input.employeeName === undefined ? expense.employeeName : input.employeeName;

  if (type === "EMPLOYEE" && !employeeName) {
    throw new ValidationError([{ path: "employeeName", message: "Укажите сотрудника, получившего зарплату." }]);
  }

  return {
    ...input,
    type,
    employeeName: type === "EMPLOYEE" ? employeeName : null,
    ...(type === "EMPLOYEE" ? { vendorName: null } : {}),
  };
}

export async function getProjectExpensePage(userId: string, projectId: string, pagination: CursorPaginationInput, type: ExpenseType | undefined, sort: ExpenseListSort) {
  const project = await findProjectForUser(prisma, projectId, userId);
  if (!project) throw new NotFoundError("Проект");
  const where = { projectId, deletedAt: null, ...(type ? { type } : {}) };
  const [expenses, totalCount] = await Promise.all([
    prisma.expense.findMany({ where, orderBy: expenseOrderBy[sort], ...toPrismaCursorPagination(pagination) }),
    prisma.expense.count({ where }),
  ]);
  return { ...createCursorPage(expenses, pagination.limit), totalCount };
}

export async function addProjectExpense(userId: string, projectId: string, input: CreateExpenseInput) {
  const payout = await inProjectTransaction(projectId, async (tx) => {
    const project = await findProjectForEditor(tx, projectId, userId);
    if (!project) throw new NotFoundError("Проект");
    if (project.status !== "ACTIVE") throw new ConflictError("Нельзя добавлять расходы в неактивный проект.");
    const existing = await tx.expense.findUnique({ where: { clientRequestId: input.clientRequestId } });
    if (existing) {
      if (existing.projectId !== projectId) throw new ConflictError("Ключ операции уже использован для другого расхода.");
      return { expense: existing, projectTitle: project.title, duplicate: true };
    }
    const expense = await createExpense(tx, projectId, input.type === "EMPLOYEE"
      ? { ...input, vendorName: null }
      : { ...input, employeeName: null });
    await changeProjectSpentAmount(tx, projectId, expense.amount);
    await recordAudit(tx, { actorId: userId, projectId, entityType: "EXPENSE", entityId: expense.id, action: "CREATE", after: toAuditExpense(expense) });
    return { expense, projectTitle: project.title, duplicate: false };
  });
  if (!payout.duplicate) await notifyTelegramAboutPayout(userId, { projectTitle: payout.projectTitle, title: payout.expense.title, amount: payout.expense.amount, date: payout.expense.date });
  return payout.expense;
}

export async function updateProjectExpense(userId: string, expenseId: string, input: UpdateExpenseInput) {
  const initial = await findExpenseForUser(prisma, expenseId, userId);
  if (!initial) throw new NotFoundError("Расход");
  return inProjectTransaction(initial.projectId, async (tx) => {
    const expense = await findExpenseForUser(tx, expenseId, userId);
    if (!expense) throw new NotFoundError("Расход");
    if (expense.project.status !== "ACTIVE") throw new ConflictError("Нельзя изменять расходы неактивного проекта.");
    const updatedExpense = await updateExpense(tx, expenseId, normalizeExpenseUpdate(expense, input));
    await changeProjectSpentAmount(tx, expense.projectId, updatedExpense.amount - expense.amount);
    await recordAudit(tx, { actorId: userId, projectId: expense.projectId, entityType: "EXPENSE", entityId: expense.id, action: "UPDATE", before: toAuditExpense(expense), after: toAuditExpense(updatedExpense) });
    return updatedExpense;
  });
}

export async function deleteProjectExpense(userId: string, expenseId: string) {
  const initial = await findExpenseForUser(prisma, expenseId, userId);
  if (!initial) throw new NotFoundError("Расход");
  return inProjectTransaction(initial.projectId, async (tx) => {
    const expense = await findExpenseForUser(tx, expenseId, userId);
    if (!expense) throw new NotFoundError("Расход");
    if (expense.project.status !== "ACTIVE") throw new ConflictError("Нельзя удалять расходы неактивного проекта.");
    await deleteExpense(tx, expenseId);
    await changeProjectSpentAmount(tx, expense.projectId, -expense.amount);
    await recordAudit(tx, { actorId: userId, projectId: expense.projectId, entityType: "EXPENSE", entityId: expense.id, action: "DELETE", before: toAuditExpense(expense) });
  });
}

export async function restoreProjectExpense(userId: string, expenseId: string) {
  const initial = await findDeletedExpenseForUser(prisma, expenseId, userId);
  if (!initial) throw new NotFoundError("Удалённый расход");
  return inProjectTransaction(initial.projectId, async (tx) => {
    const expense = await findDeletedExpenseForUser(tx, expenseId, userId);
    if (!expense) throw new NotFoundError("Удалённый расход");
    if (expense.project.status !== "ACTIVE") throw new ConflictError("Восстановить расход можно только в активном проекте.");
    const restored = await tx.expense.update({ where: { id: expenseId }, data: { deletedAt: null } });
    await changeProjectSpentAmount(tx, expense.projectId, expense.amount);
    await recordAudit(tx, { actorId: userId, projectId: expense.projectId, entityType: "EXPENSE", entityId: expense.id, action: "RESTORE", after: toAuditExpense(restored) });
    return restored;
  });
}
