import { requireAdmin } from "@/server/auth";
import { synchronizeTelegramIntegration } from "@/server/modules/telegram/telegram.service";
import { withErrorHandling } from "@/server/shared/http";

export const runtime = "nodejs";

/** Re-applies the default Mini App URL and removes obsolete per-chat overrides. */
export const POST = withErrorHandling(async () => {
  await requireAdmin();
  const result = await synchronizeTelegramIntegration({ resetLinkedChatMenuButtons: true });

  return Response.json(result, { status: result.configured && result.menuButton.ok ? 200 : 502 });
});
