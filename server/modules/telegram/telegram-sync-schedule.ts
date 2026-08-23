import "server-only";

import { after } from "next/server";

import { shouldAutoSynchronizeTelegramIntegration } from "./telegram.runtime";

let inflight: Promise<void> | null = null;
let completed = false;

/**
 * Re-registers the production menu button and webhook after the response is
 * sent. On Vercel this is backed by waitUntil, so a serverless isolate is not
 * frozen before Telegram answers.
 */
export function scheduleTelegramIntegrationSync() {
  if (!shouldAutoSynchronizeTelegramIntegration() || completed || inflight) {
    return;
  }

  after(() => {
    inflight ??= import("./telegram.service")
      .then(({ registerTelegramIntegration }) => registerTelegramIntegration())
      .then((result) => {
        if (!result.configured || (result.menuButton.ok && result.webhook.ok)) {
          completed = true;
        }
      })
      .finally(() => {
        inflight = null;
      });

    return inflight;
  });
}
