import { z } from "zod";

import { requireUser } from "@/server/auth";
import { getVerifiedTelegramUserId, linkTelegramUser } from "@/server/modules/telegram/telegram.service";
import { withErrorHandling } from "@/server/shared/http";
import { parseRequestBody } from "@/server/shared/validation";

const connectTelegramSchema = z.object({
  initData: z.string().min(1).max(8_192),
});

export const POST = withErrorHandling(async (request) => {
  const user = await requireUser();
  const { initData } = await parseRequestBody(request, connectTelegramSchema);
  const telegramUserId = getVerifiedTelegramUserId(initData);

  await linkTelegramUser(user.id, telegramUserId);

  return Response.json({ connected: true });
});
