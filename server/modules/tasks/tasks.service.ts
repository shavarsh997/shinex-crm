import "server-only";

import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@/server/generated/prisma/client";
import { ConflictError, NotFoundError } from "@/server/shared/errors";
import {
  createCursorPage,
  toPrismaCursorPagination,
  type CursorPaginationInput,
} from "@/server/shared/pagination";

import { findProjectForEditor } from "../projects/projects.repository";
import type { CreateTaskInput, UpdateTaskInput } from "./tasks.schema";

const visibleToUser = (userId: string): Prisma.TaskWhereInput => ({
  AND: [{ deletedAt: null }, { OR: [
    { createdById: userId, projectId: null },
    {
      project: {
        is: { deletedAt: null, OR: [{ userId }, { members: { some: { userId, deletedAt: null } } }] },
      },
    },
  ] }],
});

const editableByUser = (userId: string): Prisma.TaskWhereInput => ({
  AND: [{ deletedAt: null }, { OR: [
    { createdById: userId, projectId: null },
    {
      project: {
        is: {
          status: "ACTIVE",
          deletedAt: null,
          OR: [
            { userId },
            { members: { some: { userId, role: "EDITOR", deletedAt: null } } },
          ],
        },
      },
    },
  ] }],
});

const taskInclude = {
  project: { select: { id: true, title: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

export type TaskListTab = "active" | "archive";

function taskTabFilter(tab: TaskListTab): Prisma.TaskWhereInput {
  return tab === "archive" ? { status: "DONE" } : { status: { not: "DONE" } };
}

export async function getUserTaskPage(
  userId: string,
  tab: TaskListTab,
  pagination: CursorPaginationInput,
) {
  const tasks = await prisma.task.findMany({
    where: { AND: [visibleToUser(userId), taskTabFilter(tab)] },
    include: taskInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...toPrismaCursorPagination(pagination),
  });

  return createCursorPage(tasks, pagination.limit);
}

export async function getUserTaskCounts(userId: string) {
  const [active, archive] = await Promise.all([
    prisma.task.count({ where: { AND: [visibleToUser(userId), taskTabFilter("active")] } }),
    prisma.task.count({ where: { AND: [visibleToUser(userId), taskTabFilter("archive")] } }),
  ]);

  return { active, archive };
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
      status: "ACTIVE",
      deletedAt: null,
      OR: [
        { userId },
        { members: { some: { userId, role: "EDITOR", deletedAt: null } } },
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
    if (project.status !== "ACTIVE") throw new ConflictError("Нельзя добавлять задачи в неактивный проект.");
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
    if (project.status !== "ACTIVE") throw new ConflictError("Нельзя привязывать задачу к неактивному проекту.");
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

  await prisma.task.update({ where: { id: taskId }, data: { deletedAt: new Date() } });
}
