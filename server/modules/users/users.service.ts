import "server-only";

import { prisma } from "@/server/db/prisma";
import { ForbiddenError, NotFoundError } from "@/server/shared/errors";

import type { UpdateUserAccessInput } from "./users.schema";

const accessUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  approvalStatus: true,
  approvalNote: true,
  approvedAt: true,
  createdAt: true,
} as const;

export function getUsersForAccessManagement() {
  return prisma.user.findMany({
    select: accessUserSelect,
    orderBy: [{ approvalStatus: "asc" }, { createdAt: "asc" }],
  });
}

export async function updateUserAccess(
  administratorId: string,
  userId: string,
  input: UpdateUserAccessInput,
) {
  if (administratorId === userId) {
    throw new ForbiddenError("Нельзя изменять собственный уровень доступа.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new NotFoundError("Пользователь");
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      role: input.role,
      approvalStatus: input.approvalStatus,
      approvalNote: input.approvalNote,
      approvedAt: input.approvalStatus === "APPROVED" ? new Date() : null,
    },
    select: accessUserSelect,
  });
}
