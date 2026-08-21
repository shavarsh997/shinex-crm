import "server-only";

import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/shared/errors";

import { findProjectForEditor } from "../projects/projects.repository";
import type { CreateBudgetAdjustmentInput } from "./budget.schema";

export async function addBudgetAdjustment(
  userId: string,
  projectId: string,
  input: CreateBudgetAdjustmentInput,
) {
  return prisma.$transaction(async (transaction) => {
    const project = await findProjectForEditor(transaction, projectId, userId);

    if (!project) {
      throw new NotFoundError("Проект");
    }

    if (input.type === "DECREASE" && input.amount > project.estimatedAmount) {
      throw new ValidationError({ message: "Бюджет нельзя уменьшить больше, чем его текущая сумма." });
    }

    const adjustment = await transaction.budgetAdjustment.create({
      data: { ...input, projectId },
    });

    await transaction.project.update({
      where: { id: projectId },
      data: {
        estimatedAmount: {
          [input.type === "INCREASE" ? "increment" : "decrement"]: input.amount,
        },
      },
    });

    return adjustment;
  });
}
