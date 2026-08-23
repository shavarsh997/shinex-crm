"use client";

import { RefreshCw, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type SyncResult = {
  configured: boolean;
  menuButton: { ok: boolean; error?: string };
  webhook: { ok: boolean; error?: string };
  chatMenuButtons: {
    total: number;
    reset: number;
    failed: number;
    skipped: boolean;
  };
};

export function TelegramIntegrationSync() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function synchronize() {
    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/telegram/sync", { method: "POST" });
      const result = await response.json() as SyncResult;

      if (!result.configured) {
        throw new Error("Telegram не настроен: проверьте переменные окружения production.");
      }
      if (!response.ok || !result.menuButton.ok) {
        throw new Error(result.menuButton.error ?? "Не удалось обновить кнопку Telegram.");
      }

      const webhookNote = result.webhook.ok
        ? "Вебхук также обновлён."
        : "Кнопка обновлена, но вебхук не удалось обновить — проверьте Runtime Logs Vercel.";
      const resetNote = result.chatMenuButtons.skipped
        ? ""
        : ` Сброшено устаревших настроек чатов: ${result.chatMenuButtons.reset} из ${result.chatMenuButtons.total}${result.chatMenuButtons.failed ? `; ошибок: ${result.chatMenuButtons.failed}` : ""}.`;

      setMessage(`Кнопка Mini App синхронизирована. ${webhookNote}${resetNote}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось синхронизировать Telegram.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium">Telegram Mini App</p>
          <p className="mt-1 text-sm text-muted-foreground">После смены домена или деплоя обновите кнопку и сбросьте сохранённые адреса в чатах.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void synchronize()} disabled={pending}>
          {pending ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
          {pending ? "Синхронизируем…" : "Синхронизировать Telegram"}
        </Button>
      </div>
      {message && <p role="status" className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}
