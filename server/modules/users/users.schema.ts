import "server-only";

import { z } from "zod";

export const userRoleSchema = z.enum(["ADMIN", "MANAGER", "MEMBER"]);
export const userApprovalStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const updateUserAccessSchema = z.object({
  role: userRoleSchema,
  approvalStatus: userApprovalStatusSchema,
  approvalNote: z.string().trim().max(2_000).optional().transform((value) => value || null),
});

export type UpdateUserAccessInput = z.infer<typeof updateUserAccessSchema>;
