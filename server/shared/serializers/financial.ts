import "server-only";

import type { Expense, Project } from "@/server/generated/prisma/client";

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
