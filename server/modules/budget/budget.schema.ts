import "server-only";

import { BudgetAdjustmentType } from "@/server/generated/prisma/client";
import { z } from "zod";

const MAX_MONEY = 9_223_372_036_854_775_807n;

export const createBudgetAdjustmentSchema = z.object({
  type: z.enum(BudgetAdjustmentType),
  amount: z.coerce.bigint()
    .refine((value) => value > 0n, "Сумма должна быть больше нуля.")
    .refine((value) => value <= MAX_MONEY, "Сумма превышает допустимый предел."),
  date: z.coerce.date(),
  notes: z.string().trim().max(2_000).optional().transform((value) => value || undefined),
  clientRequestId: z.uuid("Некорректный ключ операции."),
});

export type CreateBudgetAdjustmentInput = z.infer<typeof createBudgetAdjustmentSchema>;
