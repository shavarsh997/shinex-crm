import { getLocale } from "./locale";
import { translations, type TranslationKey } from "./translations";

export async function getTranslations() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: TranslationKey, values?: Record<string, string | number>) => Object.entries(values ?? {}).reduce(
      (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
      translations[locale][key],
    ),
  };
}
