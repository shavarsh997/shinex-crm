import "server-only";

import { prisma } from "@/server/db/prisma";
import { ConflictError, NotFoundError } from "@/server/shared/errors";

import { findProjectForEditor } from "../projects/projects.repository";
import type { CreatePaymentInput, UpdatePaymentInput } from "./payments.schema";

export async function addProjectPayment(
  userId: string,
  projectId: string,
  input: CreatePaymentInput,
) {
  return prisma.$transaction(async (transaction) => {
    const project = await findProjectForEditor(transaction, projectId, userId);

    if (!project) {
      throw new NotFoundError("Проект");
    }

    if (project.status !== "ACTIVE") {
      throw new ConflictError("Нельзя добавлять поступления в неактивный проект.");
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

export async function updateProjectPayment(
  userId: string,
  paymentId: string,
  input: UpdatePaymentInput,
) {
  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findFirst({
      where: {
        id: paymentId,
        project: {
          OR: [
            { userId },
            { members: { some: { userId, role: "EDITOR" } } },
          ],
        },
      },
      select: {
        id: true,
        projectId: true,
        amount: true,
        project: { select: { status: true } },
      },
    });

    if (!payment) throw new NotFoundError("Поступление");
    if (payment.project.status !== "ACTIVE") {
      throw new ConflictError("Нельзя изменять поступления неактивного проекта.");
    }

    const updatedPayment = await transaction.payment.update({
      where: { id: paymentId },
      data: input,
    });

    await transaction.project.update({
      where: { id: payment.projectId },
      data: { receivedAmount: { increment: updatedPayment.amount - payment.amount } },
    });

    return updatedPayment;
  });
}

export async function deleteProjectPayment(userId: string, paymentId: string) {
  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findFirst({
      where: {
        id: paymentId,
        project: {
          OR: [
            { userId },
            { members: { some: { userId, role: "EDITOR" } } },
          ],
        },
      },
      select: {
        id: true,
        projectId: true,
        amount: true,
        project: { select: { status: true } },
      },
    });

    if (!payment) throw new NotFoundError("Поступление");
    if (payment.project.status !== "ACTIVE") {
      throw new ConflictError("Нельзя удалять поступления неактивного проекта.");
    }

    await transaction.payment.delete({ where: { id: paymentId } });
    await transaction.project.update({
      where: { id: payment.projectId },
      data: { receivedAmount: { decrement: payment.amount } },
    });
  });
}
