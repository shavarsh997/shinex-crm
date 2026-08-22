import { isValidTelegramWebhookSecret } from "@/server/modules/telegram/telegram.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isValidTelegramWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await request.json();
  } catch {
    return Response.json({ error: "Invalid update" }, { status: 400 });
  }

  return Response.json({ ok: true });
}
