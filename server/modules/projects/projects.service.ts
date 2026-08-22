import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/server/db/prisma";
import { Prisma, type ProjectStatus } from "@/server/generated/prisma/client";
import { money, recordAudit } from "@/server/shared/audit/log";
import { inProjectTransaction } from "@/server/shared/database/project-lock";
import { ConflictError, NotFoundError } from "@/server/shared/errors";

import type { CreateProjectInput, UpdateProjectInput } from "./projects.schema";
import {
  findProjectByIdForUser,
  findProjectForEditor,
  findProjectsByUserId,
  findProjectSummaryByIdForUser,
  updateProject,
} from "./projects.repository";

export function getUserProjects(userId: string, status?: ProjectStatus) {
  return findProjectsByUserId(userId, status);
}

export async function getUserProject(userId: string, projectId: string) {
  const project = await findProjectByIdForUser(projectId, userId);

  if (!project) {
    throw new NotFoundError("Проект");
  }

  const membership = project.members.find((member) => member.userId === userId);

  return {
    ...project,
    canEdit: project.userId === userId || membership?.role === "EDITOR",
    canManageMembers: project.userId === userId,
  };
}

export async function getUserProjectSummary(userId: string, projectId: string) {
  const project = await findProjectSummaryByIdForUser(projectId, userId);

  if (!project) {
    throw new NotFoundError("Проект");
  }

  const membership = project.members.find((member) => member.userId === userId);

  return {
    ...project,
    canEdit: project.userId === userId || membership?.role === "EDITOR",
    canManageMembers: project.userId === userId,
  };
}

export async function createProjectForUser(userId: string, input: CreateProjectInput) {
  const { receivedAmount, clientRequestId, ...projectInput } = input;

  try {
    return await prisma.$transaction(async (transaction) => {
    const existing = await transaction.project.findUnique({ where: { clientRequestId } });
    if (existing) {
      if (existing.userId !== userId) throw new ConflictError("Ключ операции уже использован для другого проекта.");
      return existing;
    }

    const project = await transaction.project.create({
      data: { ...projectInput, clientRequestId, receivedAmount: 0n, user: { connect: { id: userId } } },
    });

    await recordAudit(transaction, {
      actorId: userId, projectId: project.id, entityType: "PROJECT", entityId: project.id, action: "CREATE",
      after: { title: project.title, estimatedAmount: money(project.estimatedAmount) },
    });

    if (receivedAmount === 0n) {
      return project;
    }

    const initialPayment = await transaction.payment.create({
      data: {
        projectId: project.id,
        amount: receivedAmount,
        date: new Date(),
        notes: "Первое поступление при создании проекта",
        clientRequestId: randomUUID(),
      },
    });

    await recordAudit(transaction, {
      actorId: userId, projectId: project.id, entityType: "PAYMENT", entityId: initialPayment.id, action: "CREATE",
      after: { amount: money(receivedAmount), notes: "Первое поступление при создании проекта" },
    });

    return transaction.project.update({
      where: { id: project.id },
      data: { receivedAmount: { increment: receivedAmount } },
    });
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
    const duplicate = await prisma.project.findUnique({ where: { clientRequestId } });
    if (duplicate?.userId === userId) return duplicate;
    throw new ConflictError("Не удалось создать проект. Повторите попытку.");
  }
}

export async function updateProjectForUser(
  userId: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  return inProjectTransaction(projectId, async (transaction) => {
    const project = await findProjectForEditor(transaction, projectId, userId);
    if (!project) throw new NotFoundError("Проект");
    if (project.status !== "ACTIVE") throw new ConflictError("Неактивный проект нельзя изменять.");
    const updated = await updateProject(transaction, projectId, input);
    await recordAudit(transaction, {
      actorId: userId, projectId, entityType: "PROJECT", entityId: projectId, action: "UPDATE",
      before: { title: project.title, description: project.description, ownerName: project.ownerName },
      after: { title: updated.title, description: updated.description, ownerName: updated.ownerName },
    });
    return updated;
  });
}

export async function requestProjectCompletion(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } });

  if (!project) {
    throw new NotFoundError("Проект");
  }

  if (project.status === "COMPLETED") {
    throw new ConflictError("Этот проект уже завершён.");
  }

  if (project.status === "FROZEN") {
    throw new ConflictError("Сначала возобновите проект, чтобы завершить его.");
  }
}

export async function completeProjectForUser(userId: string, projectId: string) {
  await requestProjectCompletion(userId, projectId);

  const result = await prisma.project.updateMany({
    where: { id: projectId, userId, status: "ACTIVE", deletedAt: null },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  if (result.count === 0) {
    throw new ConflictError("Этот проект уже завершён.");
  }

  return prisma.project.findUniqueOrThrow({ where: { id: projectId } });
}

export async function freezeProjectForUser(userId: string, projectId: string) {
  const result = await prisma.project.updateMany({
    where: { id: projectId, userId, status: "ACTIVE", deletedAt: null },
    data: { status: "FROZEN", frozenAt: new Date() },
  });

  if (result.count === 0) {
    throw new ConflictError("Заморозить можно только активный проект.");
  }

  return prisma.project.findUniqueOrThrow({ where: { id: projectId } });
}

export async function resumeProjectForUser(userId: string, projectId: string) {
  const result = await prisma.project.updateMany({
    where: { id: projectId, userId, status: "FROZEN", deletedAt: null },
    data: { status: "ACTIVE", frozenAt: null },
  });

  if (result.count === 0) {
    throw new ConflictError("Возобновить можно только замороженный проект.");
  }

  return prisma.project.findUniqueOrThrow({ where: { id: projectId } });
}
