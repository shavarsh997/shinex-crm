import "server-only";

import { prisma } from "@/server/db/prisma";
import { ExpenseType, type Prisma } from "@/server/generated/prisma/client";
import { notifyTelegramAboutPayout } from "@/server/modules/telegram/telegram.service";
import { ConflictError, NotFoundError } from "@/server/shared/errors";
import {
  createCursorPage,
  toPrismaCursorPagination,
  type CursorPaginationInput,
} from "@/server/shared/pagination";

import { findProjectForEditor, findProjectForUser } from "../projects/projects.repository";
import type { CreateExpenseInput, UpdateExpenseInput } from "./expenses.schema";
import {
  createExpense,
  deleteExpense,
  findExpenseForUser,
  updateExpense,
  changeProjectSpentAmount,
} from "./expenses.repository";

export const expenseListSorts = ["newest", "oldest", "highest", "lowest"] as const;
export type ExpenseListSort = (typeof expenseListSorts)[number];

const expenseOrderBy: Record<ExpenseListSort, Prisma.ExpenseOrderByWithRelationInput[]> = {
  newest: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
  oldest: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  highest: [{ amount: "desc" }, { id: "desc" }],
  lowest: [{ amount: "asc" }, { id: "asc" }],
};

export async function getProjectExpensePage(
  userId: string,
  projectId: string,
  pagination: CursorPaginationInput,
  type: ExpenseType | undefined,
  sort: ExpenseListSort,
) {
  const project = await findProjectForUser(prisma, projectId, userId);
  if (!project) throw new NotFoundError("Проект");

  const where = { projectId, deletedAt: null, ...(type ? { type } : {}) };
  const [expenses, totalCount] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: expenseOrderBy[sort],
      ...toPrismaCursorPagination(pagination),
    }),
    prisma.expense.count({ where }),
  ]);

  return { ...createCursorPage(expenses, pagination.limit), totalCount };
}

export async function addProjectExpense(
  userId: string,
  projectId: string,
  input: CreateExpenseInput,
) {
  const payout = await prisma.$transaction(async (tx) => {
    const project = await findProjectForEditor(tx, projectId, userId);

    if (!project) {
      throw new NotFoundError("Проект");
    }

    if (project.status !== "ACTIVE") {
      throw new ConflictError("Нельзя добавлять расходы в неактивный проект.");
    }

    const expense = await createExpense(tx, projectId, input);
    await changeProjectSpentAmount(tx, projectId, expense.amount);

    return { expense, projectTitle: project.title };
  });

  await notifyTelegramAboutPayout(userId, {
    projectTitle: payout.projectTitle,
    title: payout.expense.title,
    amount: payout.expense.amount,
    date: payout.expense.date,
  });

  return payout.expense;
}

export async function updateProjectExpense(
  userId: string,
  expenseId: string,
  input: UpdateExpenseInput,
) {
  return prisma.$transaction(async (tx) => {
    const expense = await findExpenseForUser(tx, expenseId, userId);

    if (!expense) {
      throw new NotFoundError("Расход");
    }

    if (expense.project.status !== "ACTIVE") {
      throw new ConflictError("Нельзя изменять расходы неактивного проекта.");
    }

    const updatedExpense = await updateExpense(tx, expenseId, input);
    await changeProjectSpentAmount(tx, expense.projectId, updatedExpense.amount - expense.amount);

    return updatedExpense;
  });
}

export async function deleteProjectExpense(userId: string, expenseId: string) {
  return prisma.$transaction(async (tx) => {
    const expense = await findExpenseForUser(tx, expenseId, userId);

    if (!expense) {
      throw new NotFoundError("Расход");
    }

    if (expense.project.status !== "ACTIVE") {
      throw new ConflictError("Нельзя удалять расходы неактивного проекта.");
    }

    await deleteExpense(tx, expenseId);
    await changeProjectSpentAmount(tx, expense.projectId, -expense.amount);
  });
}
