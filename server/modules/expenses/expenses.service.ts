import "server-only";

import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@/server/generated/prisma/client";
import { NotFoundError } from "@/server/shared/errors";

import { findProjectForUser } from "../projects/projects.repository";
import type { CreateExpenseInput, UpdateExpenseInput } from "./expenses.schema";
import {
  createExpense,
  deleteExpense,
  findExpenseForUser,
  getProjectExpenseTotal,
  updateExpense,
  updateProjectSpentAmount,
} from "./expenses.repository";

async function recalculateSpentAmount(
  projectId: string,
  tx: Prisma.TransactionClient,
) {
  const spentAmount = await getProjectExpenseTotal(tx, projectId);
  await updateProjectSpentAmount(tx, projectId, spentAmount);
}

export async function addProjectExpense(
  userId: string,
  projectId: string,
  input: CreateExpenseInput,
) {
  return prisma.$transaction(async (tx) => {
    const project = await findProjectForUser(tx, projectId, userId);

    if (!project) {
      throw new NotFoundError("Проект");
    }

    const expense = await createExpense(tx, projectId, input);
    await recalculateSpentAmount(projectId, tx);

    return expense;
  });
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

    const updatedExpense = await updateExpense(tx, expenseId, input);
    await recalculateSpentAmount(expense.projectId, tx);

    return updatedExpense;
  });
}

export async function deleteProjectExpense(userId: string, expenseId: string) {
  return prisma.$transaction(async (tx) => {
    const expense = await findExpenseForUser(tx, expenseId, userId);

    if (!expense) {
      throw new NotFoundError("Расход");
    }

    await deleteExpense(tx, expenseId);
    await recalculateSpentAmount(expense.projectId, tx);
  });
}
