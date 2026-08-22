"use client";

import { Languages, Moon, Settings, Sun } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localeCookieName, locales } from "@/i18n/config";
import { useTranslations } from "@/i18n/provider";

const storageKey = "shinex-theme";

export function SettingsMenu() {
  const router = useRouter();
  const { locale, t } = useTranslations();

  function changeLocale(nextLocale: string) {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = nextLocale;
    router.refresh();
  }

  function toggleTheme() {
    const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";

    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem(storageKey, nextTheme);
  }

  return (
    <div className="fixed right-4 top-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex size-10 items-center justify-center rounded-full border bg-card text-foreground shadow-lg transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={t("settings.title")}
          title={t("settings.title")}
        >
          <Settings className="size-5" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>{t("settings.title")}</DropdownMenuLabel>
          <DropdownMenuItem onClick={toggleTheme}>
            <Sun className="hidden dark:block" aria-hidden="true" />
            <Moon className="dark:hidden" aria-hidden="true" />
            {t("theme.title")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Languages aria-hidden="true" />
              {t("language.label")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={locale} onValueChange={changeLocale}>
                <DropdownMenuRadioItem value={locales[0]} closeOnClick>{t("language.ru")}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value={locales[1]} closeOnClick>{t("language.hy")}</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
