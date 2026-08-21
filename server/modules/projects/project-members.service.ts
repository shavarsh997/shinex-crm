import "server-only";

import { prisma } from "@/server/db/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "@/server/shared/errors";

import type { AddProjectMemberInput } from "./project-members.schema";

async function findProjectForOwner(projectId: string, ownerId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: ownerId },
    select: { id: true, userId: true },
  });

  if (!project) {
    throw new ForbiddenError("Управлять участниками может только создатель проекта.");
  }

  return project;
}

export async function addProjectMember(
  ownerId: string,
  projectId: string,
  input: AddProjectMemberInput,
) {
  await findProjectForOwner(projectId, ownerId);

  if (input.userId === ownerId) {
    throw new ConflictError("Создатель проекта уже имеет полный доступ.");
  }

  const user = await prisma.user.findFirst({
    where: { id: input.userId, approvalStatus: "APPROVED" },
    select: { id: true },
  });

  if (!user) {
    throw new NotFoundError("Пользователь");
  }

  return prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: input.userId } },
    create: { projectId, userId: input.userId, role: input.role },
    update: { role: input.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function removeProjectMember(ownerId: string, projectId: string, memberId: string) {
  await findProjectForOwner(projectId, ownerId);

  const result = await prisma.projectMember.deleteMany({
    where: { projectId, userId: memberId },
  });

  if (result.count === 0) {
    throw new NotFoundError("Участник проекта");
  }
}
