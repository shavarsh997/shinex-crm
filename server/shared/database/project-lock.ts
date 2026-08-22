import "server-only";

import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@/server/generated/prisma/client";

type Transaction = Prisma.TransactionClient;

/** Serializes all financial mutations for one project until commit or rollback. */
export async function inProjectTransaction<T>(
  projectId: string,
  work: (transaction: Transaction) => Promise<T>,
) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT "id" FROM "Project" WHERE "id" = ${projectId} FOR UPDATE
    `;

    return work(transaction);
  });
}
