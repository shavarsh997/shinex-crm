import "server-only";

import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { ConflictError } from "@/server/shared/errors";

import { canSignInToCrm } from "./access";
import { hashPassword } from "./password";

const emailSchema = z.string().trim().email("Введите корректный email.").max(320)
  .transform((email) => email.toLowerCase());

export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(12, "Пароль должен содержать не менее 12 символов.").max(128),
});

export const registrationSchema = credentialsSchema.extend({
  name: z.string().trim().min(2, "Укажите имя.").max(100),
});

export async function registerWithPassword(input: z.infer<typeof registrationSchema>) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new ConflictError("Пользователь с таким email уже зарегистрирован.");
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    },
    select: { id: true },
  });

  return {
    userId: user.id,
    approved: await canSignInToCrm(user.id),
  };
}
