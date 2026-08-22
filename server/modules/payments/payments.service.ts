import "server-only";

import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@/server/generated/prisma/client";
import { money, recordAudit } from "@/server/shared/audit/log";
import { inProjectTransaction } from "@/server/shared/database/project-lock";
import { ConflictError, NotFoundError } from "@/server/shared/errors";

import { findProjectForEditor } from "../projects/projects.repository";
import type { CreatePaymentInput, UpdatePaymentInput } from "./payments.schema";

const paymentSelect = {
  id: true, projectId: true, amount: true, date: true, notes: true,
  project: { select: { status: true } },
} as const;

function paymentWhere(paymentId: string, userId: string, deleted: "active" | "deleted"): Prisma.PaymentWhereInput {
  return {
    id: paymentId,
    deletedAt: deleted === "active" ? null : { not: null },
    project: { deletedAt: null, OR: [{ userId }, { members: { some: { userId, role: "EDITOR", deletedAt: null } } }] },
  };
}

function toAuditPayment(payment: { amount: bigint; date: Date; notes: string | null }) {
  return { amount: money(payment.amount), date: payment.date.toISOString(), notes: payment.notes };
}

export async function addProjectPayment(userId: string, projectId: string, input: CreatePaymentInput) {
  return inProjectTransaction(projectId, async (transaction) => {
    const project = await findProjectForEditor(transaction, projectId, userId);
    if (!project) throw new NotFoundError("Проект");
    if (project.status !== "ACTIVE") throw new ConflictError("Нельзя добавлять поступления в неактивный проект.");
    const existing = await transaction.payment.findUnique({ where: { clientRequestId: input.clientRequestId } });
    if (existing) {
      if (existing.projectId !== projectId) throw new ConflictError("Ключ операции уже использован для другого поступления.");
      return existing;
    }
    const payment = await transaction.payment.create({ data: { ...input, projectId } });
    await transaction.project.update({ where: { id: projectId }, data: { receivedAmount: { increment: payment.amount } } });
    await recordAudit(transaction, { actorId: userId, projectId, entityType: "PAYMENT", entityId: payment.id, action: "CREATE", after: toAuditPayment(payment) });
    return payment;
  });
}

export async function updateProjectPayment(userId: string, paymentId: string, input: UpdatePaymentInput) {
  const initial = await prisma.payment.findFirst({ where: paymentWhere(paymentId, userId, "active"), select: paymentSelect });
  if (!initial) throw new NotFoundError("Поступление");
  return inProjectTransaction(initial.projectId, async (transaction) => {
    const payment = await transaction.payment.findFirst({ where: paymentWhere(paymentId, userId, "active"), select: paymentSelect });
    if (!payment) throw new NotFoundError("Поступление");
    if (payment.project.status !== "ACTIVE") throw new ConflictError("Нельзя изменять поступления неактивного проекта.");
    const updatedPayment = await transaction.payment.update({ where: { id: paymentId }, data: input });
    await transaction.project.update({ where: { id: payment.projectId }, data: { receivedAmount: { increment: updatedPayment.amount - payment.amount } } });
    await recordAudit(transaction, { actorId: userId, projectId: payment.projectId, entityType: "PAYMENT", entityId: payment.id, action: "UPDATE", before: toAuditPayment(payment), after: toAuditPayment(updatedPayment) });
    return updatedPayment;
  });
}

export async function deleteProjectPayment(userId: string, paymentId: string) {
  const initial = await prisma.payment.findFirst({ where: paymentWhere(paymentId, userId, "active"), select: paymentSelect });
  if (!initial) throw new NotFoundError("Поступление");
  return inProjectTransaction(initial.projectId, async (transaction) => {
    const payment = await transaction.payment.findFirst({ where: paymentWhere(paymentId, userId, "active"), select: paymentSelect });
    if (!payment) throw new NotFoundError("Поступление");
    if (payment.project.status !== "ACTIVE") throw new ConflictError("Нельзя удалять поступления неактивного проекта.");
    await transaction.payment.update({ where: { id: paymentId }, data: { deletedAt: new Date() } });
    await transaction.project.update({ where: { id: payment.projectId }, data: { receivedAmount: { decrement: payment.amount } } });
    await recordAudit(transaction, { actorId: userId, projectId: payment.projectId, entityType: "PAYMENT", entityId: payment.id, action: "DELETE", before: toAuditPayment(payment) });
  });
}

export async function restoreProjectPayment(userId: string, paymentId: string) {
  const initial = await prisma.payment.findFirst({ where: paymentWhere(paymentId, userId, "deleted"), select: paymentSelect });
  if (!initial) throw new NotFoundError("Удалённое поступление");
  return inProjectTransaction(initial.projectId, async (transaction) => {
    const payment = await transaction.payment.findFirst({ where: paymentWhere(paymentId, userId, "deleted"), select: paymentSelect });
    if (!payment) throw new NotFoundError("Удалённое поступление");
    if (payment.project.status !== "ACTIVE") throw new ConflictError("Восстановить поступление можно только в активном проекте.");
    const restored = await transaction.payment.update({ where: { id: paymentId }, data: { deletedAt: null } });
    await transaction.project.update({ where: { id: payment.projectId }, data: { receivedAmount: { increment: payment.amount } } });
    await recordAudit(transaction, { actorId: userId, projectId: payment.projectId, entityType: "PAYMENT", entityId: payment.id, action: "RESTORE", after: toAuditPayment(restored) });
    return restored;
  });
}
