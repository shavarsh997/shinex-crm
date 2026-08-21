import { registerWithPassword, registrationSchema } from "@/server/auth/credentials";
import { withErrorHandling } from "@/server/shared/http";
import { enforceRateLimit, getRequestClientKey } from "@/server/shared/security/rate-limit";
import { parseRequestBody } from "@/server/shared/validation";

export const POST = withErrorHandling(async (request) => {
  const input = await parseRequestBody(request, registrationSchema);
  enforceRateLimit(`registration:${getRequestClientKey(request)}`, {
    limit: 3,
    windowMs: 60 * 60 * 1_000,
  });
  const result = await registerWithPassword(input);

  return Response.json(result, { status: 201 });
});
