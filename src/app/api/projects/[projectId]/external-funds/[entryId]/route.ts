import { requireUser } from "@/server/auth";
import { updateExternalFundEntrySchema } from "@/server/modules/external-funds/external-funds.schema";
import { deleteExternalFundEntry, updateExternalFundEntry } from "@/server/modules/external-funds/external-funds.service";
import { withErrorHandling } from "@/server/shared/http";
import { requireConfirmation } from "@/server/shared/security/confirmation";
import { serializeExternalFundEntry } from "@/server/shared/serializers/financial";
import { parseRequestBody } from "@/server/shared/validation";

type Context = { params: Promise<{ projectId: string; entryId: string }> };

export const PATCH = withErrorHandling(async (request, context: Context) => {
  const user = await requireUser();
  const { projectId, entryId } = await context.params;
  await requireConfirmation(request, user.id, "external-fund-update", entryId);
  const input = await parseRequestBody(request, updateExternalFundEntrySchema);
  const entry = await updateExternalFundEntry(user.id, projectId, entryId, input, user.role === "ADMIN");
  return Response.json({ entry: serializeExternalFundEntry(entry) });
});

export const DELETE = withErrorHandling(async (request, context: Context) => {
  const user = await requireUser();
  const { projectId, entryId } = await context.params;
  await requireConfirmation(request, user.id, "external-fund-delete", entryId);
  await deleteExternalFundEntry(user.id, projectId, entryId, user.role === "ADMIN");
  return new Response(null, { status: 204 });
});
