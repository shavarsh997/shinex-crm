import "server-only";

import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@/server/generated/prisma/client";

type DbClient = typeof prisma | Prisma.TransactionClient;

export function findExpenseForUser(db: DbClient, expenseId: string, userId: string) {
  return db.expense.findFirst({
    where: {
      id: expenseId,
      project: { userId },
    },
    select: { id: true, projectId: true },
  });
}

export function createExpense(
  db: DbClient,
  projectId: string,
  data: Omit<Prisma.ExpenseCreateInput, "project">,
) {
  return db.expense.create({
    data: { ...data, project: { connect: { id: projectId } } },
  });
}

export function updateExpense(
  db: DbClient,
  expenseId: string,
  data: Prisma.ExpenseUpdateInput,
) {
  return db.expense.update({ where: { id: expenseId }, data });
}

export function deleteExpense(db: DbClient, expenseId: string) {
  return db.expense.delete({ where: { id: expenseId } });
}

export async function getProjectExpenseTotal(db: DbClient, projectId: string) {
  const result = await db.expense.aggregate({
    where: { projectId },
    _sum: { amount: true },
  });

  return result._sum.amount ?? 0n;
}

export function updateProjectSpentAmount(
  db: DbClient,
  projectId: string,
  spentAmount: bigint,
) {
  return db.project.update({ where: { id: projectId }, data: { spentAmount } });
}
