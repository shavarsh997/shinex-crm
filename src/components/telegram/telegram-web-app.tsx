"use client";

import { useEffect } from "react";

type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
    TelegramWebviewProxy?: unknown;
  }
}

export function isTelegramMiniApp() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.Telegram?.WebApp?.initData) || "TelegramWebviewProxy" in window;
}

function useTelegramWebAppReady() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    webApp.ready();
    webApp.expand();
  }, []);
}

/** Expands the Mini App viewport on every screen, including login. */
export function TelegramWebAppBootstrap() {
  useTelegramWebAppReady();
  return null;
}

/** Links the signed-in CRM user to this bot chat after login. */
export function TelegramWebAppBridge() {
  useTelegramWebAppReady();

  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;

    void fetch("/api/telegram/connect", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    }).catch((error: unknown) => {
      // A failed background link must not become an unhandled rejection in
      // the mobile WebView.
      console.warn("Telegram account connection failed", error);
    });
  }, []);

  return null;
}
