import "server-only";

import { prisma } from "@/server/db/prisma";
import { NotFoundError } from "@/server/shared/errors";

import { findProjectForUser } from "../projects/projects.repository";
import type { CreatePaymentInput } from "./payments.schema";

export async function addProjectPayment(
  userId: string,
  projectId: string,
  input: CreatePaymentInput,
) {
  return prisma.$transaction(async (transaction) => {
    const project = await findProjectForUser(transaction, projectId, userId);

    if (!project) {
      throw new NotFoundError("Проект");
    }

    const payment = await transaction.payment.create({
      data: { ...input, projectId },
    });

    await transaction.project.update({
      where: { id: projectId },
      data: { receivedAmount: { increment: payment.amount } },
    });

    return payment;
  });
}
