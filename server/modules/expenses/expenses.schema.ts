import "server-only";

import { ExpenseType } from "@/server/generated/prisma/client";
import { z } from "zod";

const optionalText = z.string().trim().max(2_000).optional().transform((value) => value || undefined);
const MAX_MONEY = 9_223_372_036_854_775_807n;
const money = z.coerce.bigint()
  .refine((value) => value > 0n, "Сумма должна быть больше нуля.")
  .refine((value) => value <= MAX_MONEY, "Сумма превышает допустимый предел.");

const expenseFields = z.object({
  type: z.enum(ExpenseType),
  title: z.string().trim().min(1, "Укажите название расхода.").max(160),
  amount: money,
  date: z.coerce.date(),
  description: optionalText,
  employeeName: z.string().trim().max(160).optional().transform((value) => value || undefined),
  vendorName: z.string().trim().max(160).optional().transform((value) => value || undefined),
  notes: optionalText,
});

export const createExpenseSchema = expenseFields.refine(
  (value) => value.type !== "EMPLOYEE" || Boolean(value.employeeName),
  { message: "Укажите сотрудника, получившего зарплату.", path: ["employeeName"] },
);

export const updateExpenseSchema = expenseFields.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Передайте хотя бы одно поле для обновления.",
);

export const expenseListQuerySchema = z.object({
  type: z.enum(ExpenseType).optional(),
  sort: z.enum(["newest", "oldest", "highest", "lowest"]).default("newest"),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseListQuery = z.infer<typeof expenseListQuerySchema>;
