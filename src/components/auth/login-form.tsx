"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginMode = "sign-in" | "register";

export function LoginForm({ accessDenied = false }: { accessDenied?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      if (mode === "register") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: String(formData.get("name") ?? ""),
            email,
            password,
          }),
        });
        const body = await response.json() as {
          approved?: boolean;
          error?: { details?: Array<{ message?: string }>; message?: string };
        };

        if (!response.ok) {
          throw new Error(body.error?.details?.[0]?.message ?? body.error?.message ?? "Не удалось создать учётную запись.");
        }

        if (!body.approved) {
          setNotice("Учётная запись создана. Дождитесь одобрения администратора.");
          return;
        }
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json() as {
        error?: { details?: Array<{ message?: string }>; message?: string };
      };

      if (!response.ok) {
        throw new Error(body.error?.details?.[0]?.message ?? body.error?.message ?? "Неверный email или пароль, либо доступ ещё не одобрен администратором.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось выполнить вход.");
    } finally {
      setIsPending(false);
    }
  }

  function changeMode(nextMode: LoginMode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  const isRegistering = mode === "register";

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm">
        <button type="button" onClick={() => changeMode("sign-in")} className={`rounded-md px-3 py-1.5 ${!isRegistering ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}>Войти</button>
        <button type="button" onClick={() => changeMode("register")} className={`rounded-md px-3 py-1.5 ${isRegistering ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}>Регистрация</button>
      </div>
      <p className="text-sm text-muted-foreground">{isRegistering ? "После регистрации дождитесь одобрения администратора." : "Введите email и пароль, которые использовали при регистрации."}</p>
      {(accessDenied || error) && <p role="alert" className="text-sm text-destructive">{error || "Доступ ещё не подтверждён администратором или был отклонён."}</p>}
      {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
      <form className="grid gap-3" onSubmit={submit}>
        {isRegistering && <label className="grid gap-1 text-sm font-medium">Имя<Input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>}
        <label className="grid gap-1 text-sm font-medium">Email<Input name="email" type="email" autoComplete="email" required maxLength={320} /></label>
        <label className="grid gap-1 text-sm font-medium">Пароль<Input name="password" type="password" autoComplete={isRegistering ? "new-password" : "current-password"} required minLength={12} maxLength={128} /></label>
        <Button type="submit" size="lg" disabled={isPending}>{isPending ? "Подождите…" : isRegistering ? "Создать учётную запись" : "Войти"}</Button>
      </form>
    </div>
  );
}
