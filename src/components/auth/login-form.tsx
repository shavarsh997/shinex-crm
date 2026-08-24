"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { isTelegramMiniApp } from "@/components/telegram/telegram-web-app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/i18n/provider";

type LoginMode = "sign-in" | "register";

export function LoginForm({ accessDenied = false }: { accessDenied?: boolean }) {
  const { t } = useTranslations();
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
          throw new Error(body.error?.details?.[0]?.message ?? body.error?.message ?? t("auth.registerFailed"));
        }

        if (!body.approved) {
          setNotice(t("auth.created"));
          return;
        }
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, telegramMiniApp: isTelegramMiniApp() }),
      });
      const body = await response.json() as {
        error?: { details?: Array<{ message?: string }>; message?: string };
      };

      if (!response.ok) {
        throw new Error(body.error?.details?.[0]?.message ?? body.error?.message ?? t("auth.loginFailed"));
      }

      router.push("/dashboard");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("auth.signInFailed"));
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
        <button type="button" onClick={() => changeMode("sign-in")} className={`rounded-md px-3 py-1.5 ${!isRegistering ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}>{t("auth.signIn")}</button>
        <button type="button" onClick={() => changeMode("register")} className={`rounded-md px-3 py-1.5 ${isRegistering ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}>{t("auth.register")}</button>
      </div>
      <p className="text-sm text-muted-foreground">{isRegistering ? t("auth.registerHint") : t("auth.signInHint")}</p>
      {(accessDenied || error) && <p role="alert" className="text-sm text-destructive">{error || t("auth.accessDenied")}</p>}
      {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
      <form className="grid gap-3" onSubmit={submit}>
        {isRegistering && <label className="grid gap-1 text-sm font-medium">{t("auth.name")}<Input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>}
        <label className="grid gap-1 text-sm font-medium">{t("auth.email")}<Input name="email" type="email" autoComplete="email" required maxLength={320} /></label>
        <label className="grid gap-1 text-sm font-medium">{t("auth.password")}<Input name="password" type="password" autoComplete={isRegistering ? "new-password" : "current-password"} required minLength={6} maxLength={50} /></label>
        <Button type="submit" size="lg" className="mt-3" disabled={isPending}>{isPending ? t("auth.wait") : isRegistering ? t("auth.createAccount") : t("auth.signIn")}</Button>
      </form>
    </div>
  );
}
