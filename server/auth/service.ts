import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";

export const SESSION_COOKIE_NAME = "shinex_session";
export const SESSION_DURATION_DAYS = 37;
export const SESSION_MAX_AGE_SECONDS = SESSION_DURATION_DAYS * 24 * 60 * 60;

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  approvalStatus: true,
  approvalNote: true,
} as const;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getSessionExpiry() {
  return new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1_000);
}

function sessionCookieOptions(telegramMiniApp: boolean) {
  return {
    httpOnly: true,
    path: "/",
    // Telegram Web loads the Mini App in a cross-site iframe. SameSite=Lax
    // cookies are stored there and the user is sent back to login after a
    // successful sign-in.
    sameSite: telegramMiniApp ? "none" : "lax",
    secure: telegramMiniApp || process.env.NODE_ENV === "production",
  } as const;
}

/**
 * Creates the only authentication token used by the application. The browser
 * receives the opaque value, while PostgreSQL keeps only its SHA-256 hash.
 */
export async function createSession(userId: string, { telegramMiniApp = false }: { telegramMiniApp?: boolean } = {}) {
  const token = randomBytes(32).toString("base64url");
  const expires = getSessionExpiry();

  await prisma.$transaction(async (transaction) => {
    await transaction.session.deleteMany({ where: { expires: { lte: new Date() } } });
    await transaction.session.create({
      data: {
        userId,
        sessionToken: hashSessionToken(token),
        expires,
      },
    });
  });

  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    ...sessionCookieOptions(telegramMiniApp),
    expires,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getSessionUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken: hashSessionToken(token) },
    select: {
      expires: true,
      user: { select: userSelect },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expires <= new Date()) {
    await prisma.session.deleteMany({
      where: { sessionToken: hashSessionToken(token) },
    });
    return null;
  }

  return session.user;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { sessionToken: hashSessionToken(token) },
    });
  }

  const expired = new Date(0);
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(false),
    expires: expired,
    maxAge: 0,
  });
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(true),
    expires: expired,
    maxAge: 0,
  });
}

export async function signOut({ redirectTo }: { redirectTo?: string } = {}) {
  await deleteSession();

  if (redirectTo) {
    redirect(redirectTo);
  }
}
