import "server-only";

import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { ConflictError } from "@/server/shared/errors";
import { Prisma } from "@/server/generated/prisma/client";

import { hashPassword, verifyPassword } from "./password";

const emailSchema = z.string().trim().email("Введите корректный email.").max(320)
  .transform((email) => email.toLowerCase());

export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(12, "Пароль должен содержать не менее 12 символов.").max(128),
});

export const registrationSchema = credentialsSchema.extend({
  name: z.string().trim().min(2, "Укажите имя.").max(100),
});

function isConfiguredAdminEmail(email: string) {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(configuredEmail) && email === configuredEmail;
}

/**
 * Checks a password and the CRM access status.  A session is intentionally
 * created elsewhere so this function can be used by a route handler without
 * coupling credential verification to a particular transport.
 */
export async function authenticateWithPassword(input: z.infer<typeof credentialsSchema>) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      approvalStatus: true,
    },
  });

  if (!user?.passwordHash || !await verifyPassword(input.password, user.passwordHash)) {
    return null;
  }

  if (user.approvalStatus !== "APPROVED") {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function registerWithPassword(input: z.infer<typeof registrationSchema>) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new ConflictError("Пользователь с таким email уже зарегистрирован.");
  }

  const isAdmin = isConfiguredAdminEmail(input.email);
  const approvedAt = isAdmin ? new Date() : null;

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: isAdmin ? "ADMIN" : "MEMBER",
        approvalStatus: isAdmin ? "APPROVED" : "PENDING",
        approvedAt,
      },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("Пользователь с таким email уже зарегистрирован.");
    }

    throw error;
  }

  return {
    userId: user.id,
    approved: isAdmin,
  };
}
