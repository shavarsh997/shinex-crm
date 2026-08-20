import { registerWithPassword, registrationSchema } from "@/server/auth/credentials";
import { withErrorHandling } from "@/server/shared/http";
import { parseRequestBody } from "@/server/shared/validation";

export const POST = withErrorHandling(async (request) => {
  const input = await parseRequestBody(request, registrationSchema);
  const result = await registerWithPassword(input);

  return Response.json(result, { status: 201 });
});
