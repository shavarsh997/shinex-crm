import "server-only";

import { TaskStatus } from "@/server/generated/prisma/client";
import { z } from "zod";

const optionalText = z.string().trim().max(2_000).optional().transform((value) => value || undefined);
const taskFields = z.object({
  title: z.string().trim().min(1, "Укажите название задачи.").max(180),
  description: optionalText,
});

export const createTaskSchema = taskFields.extend({
  projectId: z.string().trim().max(160).optional().transform((value) => value || undefined),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, "Укажите название задачи.").max(180).optional(),
  description: z.string().trim().max(2_000).optional().transform((value) => value || null),
  projectId: z.string().trim().max(160).optional().transform((value) => value || null),
  status: z.enum(TaskStatus).optional(),
}).refine(
  (value) => Object.keys(value).length > 0,
  "Передайте хотя бы одно поле для обновления.",
);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
