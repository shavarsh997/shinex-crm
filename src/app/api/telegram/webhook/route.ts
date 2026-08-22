import {
  isTelegramStartCommand,
  isValidTelegramWebhookSecret,
  sendTelegramStartMessage,
} from "@/server/modules/telegram/telegram.service";

export const runtime = "nodejs";

type TelegramUpdate = {
  message?: {
    chat?: { id?: unknown };
    text?: unknown;
  };
};

export async function POST(request: Request) {
  if (!isValidTelegramWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json() as TelegramUpdate;
  } catch {
    return Response.json({ error: "Invalid update" }, { status: 400 });
  }

  const chatId = update.message?.chat?.id;
  const text = update.message?.text;
  if (typeof chatId === "number" && Number.isSafeInteger(chatId) && typeof text === "string" && isTelegramStartCommand(text)) {
    try {
      await sendTelegramStartMessage(String(chatId));
    } catch (error) {
      console.error("Telegram /start response failed", error);
      return Response.json({ error: "Telegram response failed" }, { status: 502 });
    }
  }

  return Response.json({ ok: true });
}
