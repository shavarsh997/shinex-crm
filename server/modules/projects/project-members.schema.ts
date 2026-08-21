import "server-only";

import { ProjectMemberRole } from "@/server/generated/prisma/client";
import { z } from "zod";

export const addProjectMemberSchema = z.object({
  userId: z.string().trim().min(1, "Выберите пользователя."),
  role: z.enum(ProjectMemberRole).default("EDITOR"),
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
