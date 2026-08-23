import {
  isValidTelegramWebhookSecret,
  resetTelegramChatMenuButton,
} from "@/server/modules/telegram/telegram.service";

export const runtime = "nodejs";

type TelegramUpdate = {
  message?: {
    chat?: {
      id?: unknown;
      type?: unknown;
    };
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

  const chat = update.message?.chat;
  if (chat?.type === "private" && typeof chat.id === "number" && Number.isSafeInteger(chat.id)) {
    try {
      // Older versions configured an explicit Web App URL for each chat. Reset
      // it on the next message so this chat inherits the current default URL.
      await resetTelegramChatMenuButton(String(chat.id));
    } catch (error) {
      console.error("Telegram chat menu button reset failed", error);
      return Response.json({ error: "Telegram chat menu button reset failed" }, { status: 502 });
    }
  }

  return Response.json({ ok: true });
}
