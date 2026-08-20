import "server-only";

import { z } from "zod";

const optionalText = z.string().trim().max(2_000).optional().transform((value) => value || undefined);
const money = z.coerce.bigint().refine((value) => value >= 0n, "Сумма не может быть отрицательной.");

export const createProjectSchema = z.object({
  title: z.string().trim().min(1, "Укажите название проекта.").max(160),
  description: optionalText,
  ownerName: z.string().trim().max(160).optional().transform((value) => value || undefined),
  ownerPhone: z.string().trim().max(60).optional().transform((value) => value || undefined),
  ownerEmail: z.string().trim().email("Укажите корректный email.").optional().or(z.literal("")),
  ownerNotes: optionalText,
  estimatedAmount: money.default(0n),
  receivedAmount: money.default(0n),
});

export const updateProjectSchema = createProjectSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Передайте хотя бы одно поле для обновления.",
);

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
