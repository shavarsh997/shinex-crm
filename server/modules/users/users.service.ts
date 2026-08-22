import "server-only";

import { prisma } from "@/server/db/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "@/server/shared/errors";

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

export function getApprovedUsersForProjectAccess(excludeUserId: string) {
  return prisma.user.findMany({
    where: { approvalStatus: "APPROVED", id: { not: excludeUserId } },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
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

  return prisma.$transaction(async (transaction) => {
    // Lock every active administrator before counting them. Without this,
    // two simultaneous demotions could both see two admins and leave zero.
    await transaction.$queryRaw`
      SELECT "id" FROM "User"
      WHERE "role" = 'ADMIN' AND "approvalStatus" = 'APPROVED'
      FOR UPDATE
    `;

    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, approvalStatus: true },
    });
    if (!user) throw new NotFoundError("Пользователь");

    const revokesLastApprovedAdmin = user.role === "ADMIN"
      && user.approvalStatus === "APPROVED"
      && (input.role !== "ADMIN" || input.approvalStatus !== "APPROVED");
    if (revokesLastApprovedAdmin) {
      const approvedAdminCount = await transaction.user.count({
        where: { role: "ADMIN", approvalStatus: "APPROVED" },
      });
      if (approvedAdminCount <= 1) {
        throw new ConflictError("Нельзя отозвать доступ у последнего активного администратора.");
      }
    }

    const updatedUser = await transaction.user.update({
      where: { id: userId },
      data: {
        role: input.role,
        approvalStatus: input.approvalStatus,
        approvalNote: input.approvalNote,
        approvedAt: input.approvalStatus === "APPROVED" ? new Date() : null,
      },
      select: accessUserSelect,
    });

    if (input.approvalStatus !== "APPROVED") {
      await transaction.session.deleteMany({ where: { userId } });
    }

    return updatedUser;
  });
}
