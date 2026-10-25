import { requireUser } from "@/server/auth";
import { restoreExternalFundEntry } from "@/server/modules/external-funds/external-funds.service";
import { withErrorHandling } from "@/server/shared/http";
import { requireConfirmation } from "@/server/shared/security/confirmation";
import { serializeExternalFundEntry } from "@/server/shared/serializers/financial";

type Context = { params: Promise<{ projectId: string; entryId: string }> };

export const POST = withErrorHandling(async (request, context: Context) => {
  const user = await requireUser();
  const { projectId, entryId } = await context.params;
  await requireConfirmation(request, user.id, "external-fund-restore", entryId);
  const entry = await restoreExternalFundEntry(user.id, projectId, entryId, user.role === "ADMIN");
  return Response.json({ entry: serializeExternalFundEntry(entry) });
});
