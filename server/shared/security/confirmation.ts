import "server-only";

import { randomInt } from "node:crypto";
import { cookies } from "next/headers";

import { confirmationActions, type ConfirmationAction } from "@/lib/confirmation";
import { ValidationError } from "@/server/shared/errors";

export { confirmationActions, type ConfirmationAction };

const words = ["МАЯК", "ОРБИТА", "КЕДР", "ВЕТЕР", "ГРАНИТ", "ПУЛЬС", "СЕВЕР", "КОМЕТА"];

export function confirmationCookieName(action: ConfirmationAction, resourceId: string) {
  return `shinex_confirmation_${action.replaceAll("-", "_")}_${resourceId}`;
}

function createPhrase() {
  return `${words[randomInt(words.length)]}-${words[randomInt(words.length)]}-${randomInt(100, 1000)}`;
}

export async function issueConfirmationChallenge(userId: string, action: ConfirmationAction, resourceId: string) {
  const phrase = createPhrase();
  const cookieStore = await cookies();

  cookieStore.set(confirmationCookieName(action, resourceId), JSON.stringify({ phrase, userId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    maxAge: 10 * 60,
  });

  return phrase;
}

export async function requireConfirmation(
  request: Request,
  userId: string,
  action: ConfirmationAction,
  resourceId: string,
) {
  const suppliedCode = request.headers.get("x-shinex-confirmation-code")?.trim();
  const cookieStore = await cookies();
  const name = confirmationCookieName(action, resourceId);
  const cookie = cookieStore.get(name)?.value;
  let challenge: { phrase?: string; userId?: string } | null = null;

  try {
    challenge = cookie ? JSON.parse(cookie) as { phrase?: string; userId?: string } : null;
  } catch {
    challenge = null;
  }

  if (!suppliedCode || challenge?.phrase !== suppliedCode || challenge.userId !== userId) {
    throw new ValidationError([{ path: "confirmationCode", message: "Код подтверждения не совпадает, истёк или уже использован." }]);
  }

  cookieStore.delete({ name, path: "/api" });
}
