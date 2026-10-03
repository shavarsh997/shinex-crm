import "server-only";

import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";

import { confirmationActions, type ConfirmationAction } from "@/lib/confirmation";
import { ValidationError } from "@/server/shared/errors";

export { confirmationActions, type ConfirmationAction };

const challengeLifetimeSeconds = 10 * 60;
const challengeSchema = z.object({
  phrase: z.string().regex(/^[1-9][0-9]{2}$/),
  userId: z.string(),
  expiresAt: z.number().int(),
});

export function confirmationCookieName(action: ConfirmationAction, resourceId: string) {
  return `shinex_confirmation_${action.replaceAll("-", "_")}_${resourceId}`;
}

export async function issueConfirmationCode(userId: string, name: string, path: string) {
  const phrase = String(randomInt(100, 1000));
  const cookieStore = await cookies();

  cookieStore.set(name, JSON.stringify({ phrase, userId, expiresAt: Date.now() + challengeLifetimeSeconds * 1000 }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path,
    maxAge: challengeLifetimeSeconds,
  });

  return phrase;
}

export async function validateConfirmationCode(
  suppliedCode: string | null,
  userId: string,
  name: string,
  field = "confirmationCode",
) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(name)?.value;
  let challenge: z.infer<typeof challengeSchema> | undefined;

  try {
    challenge = challengeSchema.safeParse(cookie ? JSON.parse(cookie) : null).data;
  } catch {
    challenge = undefined;
  }

  if (!challenge || challenge.phrase !== suppliedCode?.trim() || challenge.userId !== userId || challenge.expiresAt <= Date.now()) {
    throw new ValidationError([{ path: field, message: "Код подтверждения не совпадает, истёк или уже использован." }]);
  }
}

export async function issueConfirmationChallenge(userId: string, action: ConfirmationAction, resourceId: string) {
  return issueConfirmationCode(userId, confirmationCookieName(action, resourceId), "/api");
}

export async function requireConfirmation(
  request: Request,
  userId: string,
  action: ConfirmationAction,
  resourceId: string,
) {
  const name = confirmationCookieName(action, resourceId);
  await validateConfirmationCode(request.headers.get("x-shinex-confirmation-code"), userId, name);
  (await cookies()).delete({ name, path: "/api" });
}
