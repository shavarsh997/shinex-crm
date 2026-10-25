import { requireUser } from "@/server/auth";
import { createExternalFundEntrySchema } from "@/server/modules/external-funds/external-funds.schema";
import { addExternalFundEntry, getProjectExternalFunds } from "@/server/modules/external-funds/external-funds.service";
import { withErrorHandling } from "@/server/shared/http";
import { serializeExternalFundEntry } from "@/server/shared/serializers/financial";
import { parseRequestBody } from "@/server/shared/validation";

type Context = { params: Promise<{ projectId: string }> };

export const GET = withErrorHandling(async (_request, context: Context) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  const { entries, totals } = await getProjectExternalFunds(user.id, user.role, projectId);
  return Response.json({ entries: entries.map(serializeExternalFundEntry), totals: {
    received: totals.received.toString(), spent: totals.spent.toString(), balance: totals.balance.toString(),
  } });
});

export const POST = withErrorHandling(async (request, context: Context) => {
  const user = await requireUser();
  const { projectId } = await context.params;
  const input = await parseRequestBody(request, createExternalFundEntrySchema);
  const entry = await addExternalFundEntry(user.id, projectId, input, user.role === "ADMIN");
  return Response.json({ entry: serializeExternalFundEntry(entry) }, { status: 201 });
});
