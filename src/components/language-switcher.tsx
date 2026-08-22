"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";

import { localeCookieName, locales } from "@/i18n/config";
import { useTranslations } from "@/i18n/provider";

export function LanguageSwitcher() {
  const router = useRouter();
  const { locale, t } = useTranslations();

  function changeLocale(nextLocale: string) {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = nextLocale;
    router.refresh();
  }

  return <label className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-2 text-xs font-medium text-muted-foreground"><Languages className="size-4" /><span className="sr-only">{t("language.label")}</span><select aria-label={t("language.label")} value={locale} onChange={(event) => changeLocale(event.target.value)} className="bg-transparent outline-none"><option value={locales[0]}>{t("language.ru")}</option><option value={locales[1]}>{t("language.hy")}</option></select></label>;
}
