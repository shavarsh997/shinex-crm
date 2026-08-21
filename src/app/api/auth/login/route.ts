import { authenticateWithPassword, credentialsSchema } from "@/server/auth/credentials";
import { createSession } from "@/server/auth/service";
import { withErrorHandling } from "@/server/shared/http";
import { enforceRateLimit, getRequestClientKey } from "@/server/shared/security/rate-limit";
import { parseRequestBody } from "@/server/shared/validation";

export const POST = withErrorHandling(async (request) => {
  const input = await parseRequestBody(request, credentialsSchema);
  enforceRateLimit(`login:${getRequestClientKey(request)}:${input.email}`, {
    limit: 5,
    windowMs: 15 * 60 * 1_000,
  });
  const user = await authenticateWithPassword(input);

  if (!user) {
    return Response.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Неверный email или пароль, либо доступ ещё не одобрен администратором." } },
      { status: 401 },
    );
  }

  await createSession(user.id);

  return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
