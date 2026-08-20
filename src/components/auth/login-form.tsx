"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function LoginForm({ accessDenied = false }: { accessDenied?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit() {
    setIsPending(true);
    setError(null);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setError("Не удалось начать вход через Google. Попробуйте ещё раз.");
      setIsPending(false);
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">Используйте рабочий аккаунт Google. Первый пользователь новой CRM становится администратором, для остальных доступ подтверждает администратор.</p>
      {(accessDenied || error) && <p role="alert" className="text-sm text-destructive">{error || "Доступ ещё не подтверждён администратором или был отклонён."}</p>}
      <Button type="button" size="lg" disabled={isPending} onClick={submit}>{isPending ? "Переходим в Google…" : "Войти через Google"}</Button>
    </div>
  );
}
