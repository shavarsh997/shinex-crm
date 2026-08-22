import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@/server/db/prisma";
import { ConflictError, UnauthorizedError } from "@/server/shared/errors";

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;

function getBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new ConflictError("Интеграция с Telegram ещё не настроена.");
  }

  return token;
}

/**
 * Verifies the raw Telegram.WebApp.initData string before its user data is
 * trusted. Never accept initDataUnsafe from the browser directly.
 */
export function getVerifiedTelegramUserId(initData: string) {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");

  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) {
    throw new UnauthorizedError("Не удалось подтвердить данные Telegram.");
  }

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(getBotToken()).digest();
  const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!timingSafeEqual(Buffer.from(receivedHash, "hex"), Buffer.from(expectedHash, "hex"))) {
    throw new UnauthorizedError("Не удалось подтвердить данные Telegram.");
  }

  const authDate = Number(params.get("auth_date"));
  const nowInSeconds = Math.floor(Date.now() / 1_000);
  if (!Number.isSafeInteger(authDate) || authDate > nowInSeconds + 60 || nowInSeconds - authDate > MAX_INIT_DATA_AGE_SECONDS) {
    throw new UnauthorizedError("Срок действия данных Telegram истёк. Откройте Mini App заново.");
  }

  const rawUser = params.get("user");
  if (!rawUser) {
    throw new UnauthorizedError("Telegram не передал данные пользователя.");
  }

  let user: unknown;
  try {
    user = JSON.parse(rawUser);
  } catch {
    throw new UnauthorizedError("Telegram передал некорректные данные пользователя.");
  }

  const telegramUserId = user && typeof user === "object" && "id" in user
    ? (user as { id?: unknown }).id
    : undefined;
  if (typeof telegramUserId !== "number" || !Number.isSafeInteger(telegramUserId) || telegramUserId <= 0) {
    throw new UnauthorizedError("Telegram передал некорректные данные пользователя.");
  }

  return String(telegramUserId);
}

export async function linkTelegramUser(userId: string, telegramUserId: string) {
  const linkedUser = await prisma.user.findUnique({
    where: { telegramUserId },
    select: { id: true },
  });

  if (linkedUser && linkedUser.id !== userId) {
    throw new ConflictError("Этот Telegram-аккаунт уже привязан к другому пользователю CRM.");
  }

  await prisma.user.update({ where: { id: userId }, data: { telegramUserId } });
}

type PayoutNotification = {
  chatId: string;
  projectTitle: string;
  title: string;
  amount: bigint;
  date: Date;
};

function formatPayoutNotification({ projectTitle, title, amount, date }: Omit<PayoutNotification, "chatId">) {
  const formattedAmount = new Intl.NumberFormat("ru-RU").format(amount);
  const formattedDate = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  return `Новая выплата\n\n${title}\nПроект: ${projectTitle}\nСумма: ${formattedAmount} AMD\nДата: ${formattedDate}`;
}

/** Sends a non-blocking-for-the-user Telegram notification after a payout. */
export async function notifyTelegramAboutPayout(userId: string, payout: Omit<PayoutNotification, "chatId">) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramUserId: true },
  });

  if (!user?.telegramUserId || !process.env.TELEGRAM_BOT_TOKEN) {
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${getBotToken()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: user.telegramUserId,
        text: formatPayoutNotification(payout),
      }),
      signal: AbortSignal.timeout(5_000),
    });
    const result = await response.json().catch(() => null) as { ok?: boolean; description?: string } | null;

    if (!response.ok || !result?.ok) {
      console.error("Telegram payout notification was not delivered", result?.description ?? response.status);
    }
  } catch (error) {
    console.error("Telegram payout notification failed", error);
  }
}
