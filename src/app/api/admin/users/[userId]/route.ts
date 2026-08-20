import { requireAdmin } from "@/server/auth";
import { updateUserAccessSchema } from "@/server/modules/users/users.schema";
import { updateUserAccess } from "@/server/modules/users/users.service";
import { withErrorHandling } from "@/server/shared/http";
import { parseRequestBody } from "@/server/shared/validation";

type UserRouteContext = { params: Promise<{ userId: string }> };

export const PATCH = withErrorHandling(async (request, context: UserRouteContext) => {
  const administrator = await requireAdmin();
  const { userId } = await context.params;
  const input = await parseRequestBody(request, updateUserAccessSchema);
  const user = await updateUserAccess(administrator.id, userId, input);

  return Response.json({ user });
});
