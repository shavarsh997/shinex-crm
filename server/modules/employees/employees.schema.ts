import "server-only";

import { z } from "zod";

const optionalText = z.string().trim().max(160).optional().transform((value) => value || undefined);

export const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2, "Укажите имя работника.").max(160),
  profession: optionalText,
  phone: optionalText,
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
