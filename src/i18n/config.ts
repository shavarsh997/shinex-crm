export const locales = ["ru", "hy"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ru";
export const localeCookieName = "shinex-locale";

export const localeLabels: Record<Locale, string> = {
  ru: "Русский",
  hy: "Հայերեն",
};

export function isLocale(value: string | undefined): value is Locale {
  return Boolean(value && locales.includes(value as Locale));
}
