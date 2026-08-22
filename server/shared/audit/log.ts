import "server-only";

import type { Prisma } from "@/server/generated/prisma/client";

export function money(value: bigint) {
  return value.toString();
}

export async function recordAudit(
  transaction: Prisma.TransactionClient,
  input: {
    actorId: string;
    projectId?: string;
    entityType: string;
    entityId: string;
    action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE";
    before?: Prisma.InputJsonValue | null;
    after?: Prisma.InputJsonValue | null;
  },
) {
  await transaction.auditLog.create({
    data: {
      ...input,
      projectId: input.projectId ?? null,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
    },
  });
}
