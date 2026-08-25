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

function isAdministrator(role: string) {
  return role === "ADMIN";
}

function findProjectForOwnerOrAdmin(
  db: typeof prisma | Prisma.TransactionClient,
  projectId: string,
  userId: string,
  isAdmin: boolean,
) {
  return db.project.findFirst({
    where: { id: projectId, deletedAt: null, ...(isAdmin ? {} : { userId }) },
  });
}

export function getUserProjects(userId: string, role: string, status?: ProjectStatus) {
  return findProjectsByUserId(userId, status, isAdministrator(role));
}

export async function getUserProject(userId: string, role: string, projectId: string) {
  const isAdmin = isAdministrator(role);
  const project = await findProjectByIdForUser(projectId, userId, isAdmin);

  if (!project) {
    throw new NotFoundError("Проект");
  }

  const membership = project.members.find((member) => member.userId === userId);

  return {
    ...project,
    canEdit: isAdmin || project.userId === userId || membership?.role === "EDITOR",
    canManageMembers: isAdmin || project.userId === userId,
  };
}

export async function getUserProjectSummary(userId: string, role: string, projectId: string) {
  const isAdmin = isAdministrator(role);
  const project = await findProjectSummaryByIdForUser(projectId, userId, isAdmin);

  if (!project) {
    throw new NotFoundError("Проект");
  }

  const membership = project.members.find((member) => member.userId === userId);

  return {
    ...project,
    canEdit: isAdmin || project.userId === userId || membership?.role === "EDITOR",
    canManageMembers: isAdmin || project.userId === userId,
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
  role: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  return inProjectTransaction(projectId, async (transaction) => {
    const project = await findProjectForEditor(transaction, projectId, userId, isAdministrator(role));
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

export async function requestProjectCompletion(userId: string, role: string, projectId: string) {
  const project = await findProjectForOwnerOrAdmin(prisma, projectId, userId, isAdministrator(role));

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

export async function completeProjectForUser(userId: string, role: string, projectId: string) {
  await requestProjectCompletion(userId, role, projectId);

  const project = await inProjectTransaction(projectId, async (transaction) => {
    const current = await findProjectForOwnerOrAdmin(transaction, projectId, userId, isAdministrator(role));
    if (!current || current.status !== "ACTIVE") throw new ConflictError("Этот проект уже завершён.");
    return transaction.project.update({ where: { id: projectId }, data: { status: "COMPLETED", completedAt: new Date() } });
  });

  return project;
}

export async function freezeProjectForUser(userId: string, role: string, projectId: string) {
  return inProjectTransaction(projectId, async (transaction) => {
    const project = await findProjectForOwnerOrAdmin(transaction, projectId, userId, isAdministrator(role));
    if (!project || project.status !== "ACTIVE") throw new ConflictError("Заморозить можно только активный проект.");
    return transaction.project.update({ where: { id: projectId }, data: { status: "FROZEN", frozenAt: new Date() } });
  });
}

export async function resumeProjectForUser(userId: string, role: string, projectId: string) {
  return inProjectTransaction(projectId, async (transaction) => {
    const project = await findProjectForOwnerOrAdmin(transaction, projectId, userId, isAdministrator(role));
    if (!project || project.status !== "FROZEN") throw new ConflictError("Возобновить можно только замороженный проект.");
    return transaction.project.update({ where: { id: projectId }, data: { status: "ACTIVE", frozenAt: null } });
  });
}

/**
 * Verifies that an administrator is requesting a confirmation code for an
 * existing project. Role authorization is deliberately kept at the route
 * boundary via requireAdmin().
 */
export async function requestProjectHardDeletion(projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true },
  });

  if (!project) {
    throw new NotFoundError("Проект");
  }
}

/**
 * Permanently removes a project and every record that belongs exclusively to
 * it. Financial records, budget adjustments, and members are removed by the
 * database cascades; tasks and audit history require explicit deletion.
 */
export async function hardDeleteProjectForAdmin(projectId: string) {
  return inProjectTransaction(projectId, async (transaction) => {
    const project = await transaction.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundError("Проект");
    }

    // These relations intentionally do not cascade from Project: tasks would
    // otherwise be detached, and AuditLog has no foreign key by design.
    await transaction.task.deleteMany({ where: { projectId } });
    await transaction.auditLog.deleteMany({ where: { projectId } });

    // PostgreSQL cascades this deletion to expenses, payments, budget
    // adjustments, and project memberships in one atomic transaction.
    await transaction.project.delete({ where: { id: projectId } });
  });
}
