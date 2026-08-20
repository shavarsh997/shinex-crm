import "server-only";

import { prisma } from "@/server/db/prisma";

// Serializes the one-time bootstrap on a new PostgreSQL database. The first
// Google user becomes the administrator; every later user must be approved.
const accessBootstrapLock = 1_526_289_143;

export function canSignInToCrm(userId: string) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${accessBootstrapLock})`;

    const administrator = await transaction.user.findFirst({
      where: {
        role: "ADMIN",
        approvalStatus: "APPROVED",
      },
      select: { id: true },
    });

    if (!administrator) {
      await transaction.user.update({
        where: { id: userId },
        data: {
          role: "ADMIN",
          approvalStatus: "APPROVED",
          approvedAt: new Date(),
        },
      });

      return true;
    }

    if (administrator.id === userId) {
      return true;
    }

    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { approvalStatus: true },
    });

    return user?.approvalStatus === "APPROVED";
  });
}
