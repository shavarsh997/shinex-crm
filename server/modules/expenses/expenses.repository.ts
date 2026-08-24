import "server-only";

import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@/server/generated/prisma/client";

type DbClient = typeof prisma | Prisma.TransactionClient;

export function findExpenseForUser(db: DbClient, expenseId: string, userId: string) {
  return db.expense.findFirst({
    where: {
      id: expenseId,
      deletedAt: null,
      project: {
        deletedAt: null,
        OR: [
          { userId },
          { members: { some: { userId, role: "EDITOR", deletedAt: null } } },
        ],
      },
    },
    select: {
      id: true, projectId: true, type: true, title: true, amount: true, date: true,
      description: true, employeeName: true, employeeId: true, vendorName: true, notes: true,
      project: { select: { status: true } },
    },
  });
}

export function findDeletedExpenseForUser(db: DbClient, expenseId: string, userId: string) {
  return db.expense.findFirst({
    where: {
      id: expenseId,
      deletedAt: { not: null },
      project: {
        deletedAt: null,
        OR: [{ userId }, { members: { some: { userId, role: "EDITOR", deletedAt: null } } }],
      },
    },
    select: {
      id: true, projectId: true, type: true, title: true, amount: true, date: true,
      description: true, employeeName: true, employeeId: true, vendorName: true, notes: true,
      project: { select: { status: true } },
    },
  });
}

export function createExpense(
  db: DbClient,
  projectId: string,
  data: Omit<Prisma.ExpenseUncheckedCreateInput, "projectId">,
) {
  return db.expense.create({
    data: { ...data, projectId },
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
  return db.expense.update({ where: { id: expenseId }, data: { deletedAt: new Date() } });
}

export function changeProjectSpentAmount(
  db: DbClient,
  projectId: string,
  amountDelta: bigint,
) {
  return db.project.update({
    where: { id: projectId },
    data: { spentAmount: { increment: amountDelta } },
  });
}
