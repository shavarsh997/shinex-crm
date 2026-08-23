import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/server/db/prisma", () => ({
  prisma: { user: { findMany } },
}));

import { synchronizeTelegramIntegration } from "./telegram.service";

const originalFetch = global.fetch;
const originalEnvironment = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_WEB_APP_URL: process.env.TELEGRAM_WEB_APP_URL,
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
};

describe("Telegram integration synchronization", () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_WEB_APP_URL = "https://crm.example.com";
    process.env.TELEGRAM_WEBHOOK_SECRET = "a".repeat(32);
    findMany.mockReset();
    global.fetch = vi.fn(async (input) => {
      const url = String(input);
      const body = url.includes("setWebhook")
        ? { ok: false, description: "Webhook endpoint is unavailable" }
        : { ok: true };

      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;
  });

  it("updates the default menu button even if webhook registration fails", async () => {
    const result = await synchronizeTelegramIntegration();

    expect(result.menuButton).toEqual({ ok: true });
    expect(result.webhook).toEqual({ ok: false, error: "Webhook endpoint is unavailable" });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("resets saved chat-specific buttons to inherit the default button", async () => {
    findMany.mockResolvedValue([{ telegramUserId: "123" }, { telegramUserId: "456" }]);
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as typeof fetch;

    const result = await synchronizeTelegramIntegration({ resetLinkedChatMenuButtons: true });
    const menuButtonBodies = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      .filter(([url]) => String(url).includes("setChatMenuButton"))
      .map(([, init]) => JSON.parse(String((init as RequestInit).body)) as { menu_button: { type: string } });

    expect(result.chatMenuButtons).toEqual({ total: 2, reset: 2, failed: 0, skipped: false });
    expect(menuButtonBodies.map((body) => body.menu_button.type)).toEqual(["web_app", "default", "default"]);
  });
});

afterAll(() => {
  global.fetch = originalFetch;
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});
