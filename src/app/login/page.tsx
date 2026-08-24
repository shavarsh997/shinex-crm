import { LoginForm } from "@/components/auth/login-form";
import { ShinexLogo } from "@/components/brand/shinex-logo";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/auth";
import { getTranslations } from "@/i18n/server";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const { t } = await getTranslations();

  return <main className="flex min-h-screen items-center justify-center bg-muted/40 p-5"><section className="w-full max-w-sm rounded-2xl bg-card p-7 shadow-sm ring-1 ring-foreground/10"><ShinexLogo className="mb-5 text-slate-950 dark:text-white" /><h1 className="text-2xl font-semibold">{t("auth.title")}</h1><p className="mb-6 mt-2 text-sm text-muted-foreground">{t("auth.description")}</p><LoginForm accessDenied={error === "AccessDenied"} /></section></main>;
}
