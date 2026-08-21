import "server-only";

import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@/server/generated/prisma/client";
import { NotFoundError } from "@/server/shared/errors";

import { findProjectForEditor } from "../projects/projects.repository";
import type { CreateTaskInput, UpdateTaskInput } from "./tasks.schema";

const visibleToUser = (userId: string): Prisma.TaskWhereInput => ({
  OR: [
    { createdById: userId },
    {
      project: {
        is: { OR: [{ userId }, { members: { some: { userId } } }] },
      },
    },
  ],
});

const editableByUser = (userId: string): Prisma.TaskWhereInput => ({
  OR: [
    { createdById: userId },
    {
      project: {
        is: {
          OR: [
          { userId },
          { members: { some: { userId, role: "EDITOR" } } },
          ],
        },
      },
    },
  ],
});

const taskInclude = {
  project: { select: { id: true, title: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

export function getUserTasks(userId: string) {
  return prisma.task.findMany({
    where: visibleToUser(userId),
    include: taskInclude,
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
  });
}

export function getActiveTaskCount(userId: string) {
  return prisma.task.count({
    where: {
      AND: [visibleToUser(userId), { status: { not: "DONE" } }],
    },
  });
}

export function getEditableProjectsForTasks(userId: string) {
  return prisma.project.findMany({
    where: {
      OR: [
        { userId },
        { members: { some: { userId, role: "EDITOR" } } },
      ],
    },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

export async function createTaskForUser(userId: string, input: CreateTaskInput) {
  if (input.projectId) {
    const project = await findProjectForEditor(prisma, input.projectId, userId);
    if (!project) throw new NotFoundError("Проект");
  }

  return prisma.task.create({
    data: { ...input, createdById: userId },
    include: taskInclude,
  });
}

export async function updateTaskForUser(userId: string, taskId: string, input: UpdateTaskInput) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, ...editableByUser(userId) },
    select: { id: true },
  });
  if (!task) throw new NotFoundError("Задача");

  if (input.projectId) {
    const project = await findProjectForEditor(prisma, input.projectId, userId);
    if (!project) throw new NotFoundError("Проект");
  }

  return prisma.task.update({
    where: { id: taskId },
    data: {
      ...input,
      completedAt: input.status === "DONE" ? new Date() : input.status ? null : undefined,
    },
    include: taskInclude,
  });
}

export async function deleteTaskForUser(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, ...editableByUser(userId) },
    select: { id: true },
  });
  if (!task) throw new NotFoundError("Задача");

  await prisma.task.delete({ where: { id: taskId } });
}
