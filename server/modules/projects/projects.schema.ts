import "server-only";

import { z } from "zod";

const MAX_MONEY = 9_223_372_036_854_775_807n;
const optionalText = z.string().trim().max(2_000).optional().transform((value) => value || undefined);
const nullableOptionalText = z.string().trim().max(2_000).optional().transform((value) => value === undefined ? undefined : value || null);
const nullableOptionalShortText = z.string().trim().max(160).optional().transform((value) => value === undefined ? undefined : value || null);
const optionalEmail = z.string().trim().email("Укажите корректный email.").optional().or(z.literal("")).transform((value) => value || undefined);
const nullableOptionalEmail = z.string().trim().email("Укажите корректный email.").optional().or(z.literal("")).transform((value) => value === undefined ? undefined : value || null);
const money = z.coerce.bigint()
  .refine((value) => value >= 0n, "Сумма не может быть отрицательной.")
  .refine((value) => value <= MAX_MONEY, "Сумма превышает допустимый предел.");

export const createProjectSchema = z.object({
  title: z.string().trim().min(1, "Укажите название проекта.").max(160),
  description: optionalText,
  ownerName: z.string().trim().max(160).optional().transform((value) => value || undefined),
  ownerPhone: z.string().trim().max(60).optional().transform((value) => value || undefined),
  ownerEmail: optionalEmail,
  ownerNotes: optionalText,
  estimatedAmount: money.default(0n),
  receivedAmount: money.default(0n),
  clientRequestId: z.uuid("Некорректный ключ операции."),
});

// Financial totals are maintained exclusively by their ledgers: payments and
// budget adjustments. Keeping them out of the general project update avoids
// creating a total that cannot be reconciled with the operation history.
export const updateProjectSchema = z.object({
  title: z.string().trim().min(1, "Укажите название проекта.").max(160).optional(),
  description: nullableOptionalText,
  ownerName: nullableOptionalShortText,
  ownerPhone: z.string().trim().max(60).optional().transform((value) => value === undefined ? undefined : value || null),
  ownerEmail: nullableOptionalEmail,
  ownerNotes: nullableOptionalText,
}).refine(
  (value) => Object.keys(value).length > 0,
  "Передайте хотя бы одно поле для обновления.",
);

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
