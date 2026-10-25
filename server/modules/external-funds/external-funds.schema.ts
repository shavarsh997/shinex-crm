import "server-only";

import { z } from "zod";
import { externalFundCategories } from "@/lib/external-funds";

const optionalText = (max: number) => z.string().trim().max(max).nullish().transform((value) => value || null);
const fields = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.enum(externalFundCategories).nullish(),
  title: z.string().trim().min(1, "Укажите назначение операции.").max(200),
  amount: z.union([z.string().trim().regex(/^\d+$/, "Введите целую сумму в AMD."), z.bigint(), z.number().int().safe()])
    .transform((value) => BigInt(value))
    .refine((value) => value > 0n && value <= 9_223_372_036_854_775_807n, "Сумма должна быть больше нуля и не превышать допустимый предел."),
  date: z.iso.date("Укажите корректную дату.").transform((value) => new Date(`${value}T00:00:00.000Z`)),
  counterparty: optionalText(200),
  notes: optionalText(2_000),
});

function validateCategory(value: { type: string; category?: string | null }) {
  return value.type !== "EXPENSE" || Boolean(value.category);
}

const categoryError = { message: "Выберите категорию расхода.", path: ["category"] };

export const updateExternalFundEntrySchema = fields.refine(validateCategory, categoryError)
  .transform((value) => ({ ...value, category: value.type === "INCOME" ? null : value.category! }));

export const createExternalFundEntrySchema = fields.extend({ clientRequestId: z.uuid("Некорректный ключ операции.") })
  .refine(validateCategory, categoryError)
  .transform((value) => ({ ...value, category: value.type === "INCOME" ? null : value.category! }));

export type CreateExternalFundEntryInput = z.infer<typeof createExternalFundEntrySchema>;
export type UpdateExternalFundEntryInput = z.infer<typeof updateExternalFundEntrySchema>;
