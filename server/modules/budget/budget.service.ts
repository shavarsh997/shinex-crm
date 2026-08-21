import "server-only";

import { prisma } from "@/server/db/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import {
  createCursorPage,
  toPrismaCursorPagination,
  type CursorPaginationInput,
} from "@/server/shared/pagination";

import { findProjectForEditor, findProjectForUser } from "../projects/projects.repository";
import type { CreateBudgetAdjustmentInput } from "./budget.schema";

export async function getProjectBudgetAdjustmentPage(
  userId: string,
  projectId: string,
  pagination: CursorPaginationInput,
) {
  const project = await findProjectForUser(prisma, projectId, userId);
  if (!project) throw new NotFoundError("Проект");

  const where = { projectId };
  const [adjustments, totalCount] = await Promise.all([
    prisma.budgetAdjustment.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      ...toPrismaCursorPagination(pagination),
    }),
    prisma.budgetAdjustment.count({ where }),
  ]);

  return { ...createCursorPage(adjustments, pagination.limit), totalCount };
}

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

    if (project.status !== "ACTIVE") {
      throw new ConflictError("Нельзя менять бюджет неактивного проекта.");
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
