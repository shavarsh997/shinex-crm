import "server-only";

import { prisma } from "@/server/db/prisma";
import type { Prisma, ProjectStatus } from "@/server/generated/prisma/client";

type DbClient = typeof prisma | Prisma.TransactionClient;

const projectSummaryInclude = {
  user: {
    select: { id: true, name: true, email: true },
  },
  members: {
    where: { deletedAt: null },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
  },
} as const;

export function findProjectsByUserId(userId: string, status?: ProjectStatus) {
  return prisma.project.findMany({
    where: {
      deletedAt: null,
      OR: [{ userId }, { members: { some: { userId, deletedAt: null } } }],
      ...(status ? { status } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function findProjectByIdForUser(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      OR: [{ userId }, { members: { some: { userId, deletedAt: null } } }],
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      expenses: {
        where: { deletedAt: null },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
      payments: {
        where: { deletedAt: null },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
      budgetAdjustments: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
      members: {
        where: { deletedAt: null },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export function findProjectSummaryByIdForUser(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      OR: [{ userId }, { members: { some: { userId, deletedAt: null } } }],
    },
    include: projectSummaryInclude,
  });
}

export function findProjectForUser(db: DbClient, projectId: string, userId: string) {
  return db.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      OR: [{ userId }, { members: { some: { userId, deletedAt: null } } }],
    },
  });
}

export function findProjectForEditor(db: DbClient, projectId: string, userId: string) {
  return db.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      OR: [
        { userId },
        { members: { some: { userId, role: "EDITOR", deletedAt: null } } },
      ],
    },
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
