"use client";

import { createContext, useContext } from "react";

import type { Locale } from "./config";
import { translations, type TranslationKey } from "./translations";

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;

const I18nContext = createContext<{ locale: Locale; t: Translate } | null>(null);

function translate(locale: Locale, key: TranslationKey, values?: Record<string, string | number>) {
  return Object.entries(values ?? {}).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    translations[locale][key],
  );
}

export function LocaleProvider({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  return <I18nContext value={{ locale, t: (key, values) => translate(locale, key, values) }}>{children}</I18nContext>;
}

export function useTranslations() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useTranslations must be used within LocaleProvider");
  return context;
}
