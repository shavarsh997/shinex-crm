import "server-only";

import type { Expense, ExternalFundEntry, Payment, Project } from "@/server/generated/prisma/client";

export function serializeExternalFundEntry(entry: ExternalFundEntry) {
  return {
    ...entry,
    amount: entry.amount.toString(),
    date: entry.date.toISOString(),
    deletedAt: entry.deletedAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export function serializeProject(project: Project) {
  return {
    ...project,
    estimatedAmount: project.estimatedAmount.toString(),
    receivedAmount: project.receivedAmount.toString(),
    spentAmount: project.spentAmount.toString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export function serializeExpense(expense: Expense) {
  return {
    ...expense,
    amount: expense.amount.toString(),
    date: expense.date.toISOString(),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

export function serializePayment(payment: Payment) {
  return {
    ...payment,
    amount: payment.amount.toString(),
    date: payment.date.toISOString(),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}
