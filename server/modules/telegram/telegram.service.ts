import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@/server/db/prisma";
import { ConflictError, UnauthorizedError } from "@/server/shared/errors";
import { shouldAutoSynchronizeTelegramIntegration } from "./telegram.runtime";

export { shouldAutoSynchronizeTelegramIntegration };

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;
const telegramApiBaseUrl = "https://api.telegram.org";

type TelegramApiResult = {
  ok?: boolean;
  description?: string;
};

type TelegramMenuButton = {
  type: "web_app";
  text: string;
  web_app: { url: string };
};

type TelegramDefaultMenuButton = {
  type: "default";
};

type TelegramSyncStep =
  | { ok: true }
  | { ok: false; error: string };

export type TelegramIntegrationSyncResult = {
  configured: boolean;
  menuButton: TelegramSyncStep;
  webhook: TelegramSyncStep;
  chatMenuButtons: {
    total: number;
    reset: number;
    failed: number;
    skipped: boolean;
  };
};

function getBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new ConflictError("Интеграция с Telegram ещё не настроена.");
  }

  return token;
}

function getTelegramWebAppUrl() {
  const value = process.env.TELEGRAM_WEB_APP_URL;

  if (!value) {
    throw new ConflictError("Не указан адрес Telegram Mini App.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConflictError("Укажите корректный HTTPS-адрес Telegram Mini App.");
  }

  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) {
    throw new ConflictError("Адрес Telegram Mini App должен быть HTTPS-адресом главной страницы CRM.");
  }

  return url;
}

function getTelegramWebhookSecret() {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!secret || !/^[A-Za-z0-9_-]{32,256}$/.test(secret)) {
    throw new ConflictError("Укажите секрет вебхука Telegram из 32–256 латинских букв, цифр, «_» или «-».");
  }

  return secret;
}

async function callTelegramApi(method: string, body: Record<string, unknown>) {
  const response = await fetch(`${telegramApiBaseUrl}/bot${getBotToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000),
  });
  const result = await response.json().catch(() => null) as TelegramApiResult | null;

  if (!response.ok || !result?.ok) {
    throw new Error(result?.description ?? `Telegram API returned ${response.status}`);
  }
}

/** Verifies Telegram's secret-token header before processing an incoming update. */
export function isValidTelegramWebhookSecret(receivedSecret: string | null) {
  try {
    const configuredSecret = Buffer.from(getTelegramWebhookSecret());
    const candidateSecret = Buffer.from(receivedSecret ?? "");

    return configuredSecret.length === candidateSecret.length
      && timingSafeEqual(configuredSecret, candidateSecret);
  } catch {
    return false;
  }
}

function createTelegramMenuButton(): TelegramMenuButton {
  const webAppUrl = getTelegramWebAppUrl();

  return {
    type: "web_app",
    text: "Открыть CRM",
    web_app: { url: webAppUrl.toString() },
  };
}

/** Makes the CRM available from the menu button beside the chat input in every private bot chat. */
async function registerTelegramMenuButton() {
  const menuButton = createTelegramMenuButton();

  await callTelegramApi("setChatMenuButton", {
    menu_button: menuButton,
  });
}

/** Removes a per-chat override so the chat inherits the bot's current default menu button. */
export async function resetTelegramChatMenuButton(chatId: string) {
  const menuButton: TelegramDefaultMenuButton = { type: "default" };

  await callTelegramApi("setChatMenuButton", {
    chat_id: chatId,
    menu_button: menuButton,
  });
}

/** Registers this deployment as the bot's webhook receiver. */
async function registerTelegramWebhook() {
  const webAppUrl = getTelegramWebAppUrl();
  const webhookUrl = new URL("/api/telegram/webhook", webAppUrl).toString();

  await callTelegramApi("setWebhook", {
    url: webhookUrl,
    secret_token: getTelegramWebhookSecret(),
    allowed_updates: ["message"],
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function runTelegramSyncStep(action: () => Promise<void>): Promise<TelegramSyncStep> {
  try {
    await action();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

/**
 * Updates Telegram's default menu button and webhook independently. The Mini
 * App remains launchable even if Telegram cannot currently reach the webhook.
 */
export async function synchronizeTelegramIntegration({
  resetLinkedChatMenuButtons = false,
}: {
  resetLinkedChatMenuButtons?: boolean;
} = {}): Promise<TelegramIntegrationSyncResult> {
  const configurationProvided = Boolean(
    process.env.TELEGRAM_BOT_TOKEN
    || process.env.TELEGRAM_WEB_APP_URL
    || process.env.TELEGRAM_WEBHOOK_SECRET,
  );

  if (!configurationProvided) {
    return {
      configured: false,
      menuButton: { ok: true },
      webhook: { ok: true },
      chatMenuButtons: { total: 0, reset: 0, failed: 0, skipped: true },
    };
  }

  const [menuButton, webhook] = await Promise.all([
    runTelegramSyncStep(registerTelegramMenuButton),
    runTelegramSyncStep(registerTelegramWebhook),
  ]);

  if (!resetLinkedChatMenuButtons || !menuButton.ok) {
    return {
      configured: true,
      menuButton,
      webhook,
      chatMenuButtons: { total: 0, reset: 0, failed: 0, skipped: true },
    };
  }

  const linkedUsers = await prisma.user.findMany({
    where: { telegramUserId: { not: null } },
    select: { telegramUserId: true },
  });
  const resetResults = await Promise.all(
    linkedUsers.map(({ telegramUserId }) => runTelegramSyncStep(
      () => resetTelegramChatMenuButton(telegramUserId!),
    )),
  );

  return {
    configured: true,
    menuButton,
    webhook,
    chatMenuButtons: {
      total: linkedUsers.length,
      reset: resetResults.filter((result) => result.ok).length,
      failed: resetResults.filter((result) => !result.ok).length,
      skipped: false,
    },
  };
}

/** Runs a best-effort integration sync when a production server instance starts. */
export async function registerTelegramIntegration() {
  if (!shouldAutoSynchronizeTelegramIntegration()) {
    return {
      configured: false,
      menuButton: { ok: true },
      webhook: { ok: true },
      chatMenuButtons: { total: 0, reset: 0, failed: 0, skipped: true },
    } satisfies TelegramIntegrationSyncResult;
  }

  const result = await synchronizeTelegramIntegration();

  if (!result.configured) {
    return result;
  }

  if (!result.menuButton.ok) {
    console.error("Telegram menu button registration failed", result.menuButton.error);
  }
  if (!result.webhook.ok) {
    console.error("Telegram webhook registration failed", result.webhook.error);
  }

  return result;
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
    await callTelegramApi("sendMessage", {
      chat_id: user.telegramUserId,
      text: formatPayoutNotification(payout),
    });
  } catch (error) {
    console.error("Telegram payout notification failed", error);
  }
}
