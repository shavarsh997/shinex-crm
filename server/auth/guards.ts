import "server-only";

import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { ForbiddenError, UnauthorizedError } from "@/server/shared/errors";

import { auth } from "./service";

export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      approvalStatus: true,
      approvalNote: true,
    },
  });

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

export async function getAuthenticatedUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
