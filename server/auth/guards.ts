import "server-only";

import { UnauthorizedError } from "@/server/shared/errors";

import { auth } from "./service";

export async function requireUser() {
  const session = await auth();

  if (!session?.user) {
    throw new UnauthorizedError();
  }

  return session.user;
}
