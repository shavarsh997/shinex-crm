import "server-only";

import { z } from "zod";

const MAX_MONEY = 9_223_372_036_854_775_807n;

export const createPaymentSchema = z.object({
  amount: z.coerce.bigint()
    .refine((value) => value > 0n, "Сумма должна быть больше нуля.")
    .refine((value) => value <= MAX_MONEY, "Сумма превышает допустимый предел."),
  date: z.coerce.date(),
  notes: z.string().trim().max(2_000).optional().transform((value) => value || undefined),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
