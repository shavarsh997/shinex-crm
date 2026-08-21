import "server-only";

import { prisma } from "@/server/db/prisma";
import { NotFoundError } from "@/server/shared/errors";

import type { CreateProjectInput, UpdateProjectInput } from "./projects.schema";
import {
  findProjectByIdForUser,
  findProjectForEditor,
  findProjectsByUserId,
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

  return updateProject(prisma, projectId, input);
}
