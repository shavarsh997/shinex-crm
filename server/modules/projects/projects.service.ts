import "server-only";

import { prisma } from "@/server/db/prisma";
import { ConflictError, NotFoundError } from "@/server/shared/errors";

import type { CreateProjectInput, UpdateProjectInput } from "./projects.schema";
import {
  findProjectByIdForUser,
  findProjectForEditor,
  findProjectsByUserId,
  findProjectSummaryByIdForUser,
  updateProject,
} from "./projects.repository";

export function getUserProjects(userId: string) {
  return findProjectsByUserId(userId);
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

export function createProjectForUser(userId: string, input: CreateProjectInput) {
  const { receivedAmount, ...projectInput } = input;

  return prisma.$transaction(async (transaction) => {
    const project = await transaction.project.create({
      data: {
        ...projectInput,
        receivedAmount: 0n,
        user: { connect: { id: userId } },
      },
    });

    if (receivedAmount === 0n) {
      return project;
    }

    await transaction.payment.create({
      data: {
        projectId: project.id,
        amount: receivedAmount,
        date: new Date(),
        notes: "Первое поступление при создании проекта",
      },
    });

    return transaction.project.update({
      where: { id: project.id },
      data: { receivedAmount: { increment: receivedAmount } },
    });
  });
}

export async function updateProjectForUser(
  userId: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  const project = await findProjectForEditor(prisma, projectId, userId);

  if (!project) {
    throw new NotFoundError("Проект");
  }

  if (project.status !== "ACTIVE") {
    throw new ConflictError("Неактивный проект нельзя изменять.");
  }

  return updateProject(prisma, projectId, input);
}

export async function requestProjectCompletion(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });

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
    where: { id: projectId, userId, status: "ACTIVE" },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  if (result.count === 0) {
    throw new ConflictError("Этот проект уже завершён.");
  }

  return prisma.project.findUniqueOrThrow({ where: { id: projectId } });
}

export async function freezeProjectForUser(userId: string, projectId: string) {
  const result = await prisma.project.updateMany({
    where: { id: projectId, userId, status: "ACTIVE" },
    data: { status: "FROZEN", frozenAt: new Date() },
  });

  if (result.count === 0) {
    throw new ConflictError("Заморозить можно только активный проект.");
  }

  return prisma.project.findUniqueOrThrow({ where: { id: projectId } });
}

export async function resumeProjectForUser(userId: string, projectId: string) {
  const result = await prisma.project.updateMany({
    where: { id: projectId, userId, status: "FROZEN" },
    data: { status: "ACTIVE", frozenAt: null },
  });

  if (result.count === 0) {
    throw new ConflictError("Возобновить можно только замороженный проект.");
  }

  return prisma.project.findUniqueOrThrow({ where: { id: projectId } });
}
