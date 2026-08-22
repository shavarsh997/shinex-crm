import { cookies } from "next/headers";

import { defaultLocale, isLocale, localeCookieName, type Locale } from "./config";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(localeCookieName)?.value;
  return isLocale(value) ? value : defaultLocale;
}
