import "server-only";

import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@/server/generated/prisma/client";

type DbClient = typeof prisma | Prisma.TransactionClient;

export function findProjectsByUserId(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export function findProjectByIdForUser(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      expenses: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
    },
  });
}

export function findProjectForUser(db: DbClient, projectId: string, userId: string) {
  return db.project.findFirst({
    where: { id: projectId, userId },
  });
}

export function createProject(
  userId: string,
  data: Omit<Prisma.ProjectCreateInput, "user">,
) {
  return prisma.project.create({
    data: { ...data, user: { connect: { id: userId } } },
  });
}

export function updateProject(
  db: DbClient,
  projectId: string,
  data: Prisma.ProjectUpdateInput,
) {
  return db.project.update({ where: { id: projectId }, data });
}
