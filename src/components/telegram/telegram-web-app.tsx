"use client";

import { useEffect } from "react";

type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  isFullscreen?: boolean;
  requestFullscreen?: () => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

/** Makes the CRM use the Telegram Mini App viewport and links the current CRM user to this bot chat. */
export function TelegramWebAppBridge() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    webApp.ready();
    webApp.expand();
    if (!webApp.isFullscreen) {
      webApp.requestFullscreen?.();
    }

    if (!webApp.initData) return;

    void fetch("/api/telegram/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: webApp.initData }),
    });
  }, []);

  return null;
}
