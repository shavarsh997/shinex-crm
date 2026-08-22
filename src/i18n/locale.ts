import { cookies, headers } from "next/headers";

import { defaultLocale, isLocale, localeCookieName, type Locale } from "./config";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(localeCookieName)?.value;
  if (isLocale(value)) return value;

  const acceptedLanguages = (await headers()).get("accept-language")?.toLowerCase().split(",") ?? [];
  if (acceptedLanguages.some((language) => language.trim().startsWith("hy"))) return "hy";
  if (acceptedLanguages.some((language) => language.trim().startsWith("ru"))) return "ru";

  return defaultLocale;
}
