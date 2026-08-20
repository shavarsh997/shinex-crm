import "server-only";

import { prisma } from "@/server/db/prisma";
import { NotFoundError } from "@/server/shared/errors";

import type { CreateProjectInput, UpdateProjectInput } from "./projects.schema";
import {
  createProject,
  findProjectByIdForUser,
  findProjectForUser,
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

  return project;
}

export function createProjectForUser(userId: string, input: CreateProjectInput) {
  return createProject(userId, input);
}

export async function updateProjectForUser(
  userId: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  const project = await findProjectForUser(prisma, projectId, userId);

  if (!project) {
    throw new NotFoundError("Проект");
  }

  return updateProject(prisma, projectId, input);
}
