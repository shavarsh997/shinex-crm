import "server-only";

import { redirect } from "next/navigation";

import { ForbiddenError, UnauthorizedError } from "@/server/shared/errors";

import { getSessionUser } from "./service";

export async function getCurrentUser() {
  const user = await getSessionUser();

  return user?.approvalStatus === "APPROVED" ? user : null;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Подтверждать пользователей может только администратор.");
  }

  return user;
}

export async function requireProjectEditor() {
  const user = await requireUser();

  if (user.role === "MEMBER") {
    throw new ForbiddenError("Редактировать проекты могут только менеджеры и администраторы.");
  }

  return user;
}

export async function getAuthenticatedUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
