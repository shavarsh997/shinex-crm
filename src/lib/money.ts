import type { Locale } from "@/i18n/config";

export function formatMoney(amount: bigint | number | string, locale: Locale = "ru"): string {
  const value = typeof amount === "bigint" ? amount : BigInt(amount);

  return `${new Intl.NumberFormat(locale === "hy" ? "hy-AM" : "ru-RU").format(value)} ֏`;
}

export function parseMoneyInput(value: string): bigint | null {
  const normalized = value.replace(/[\s,]/g, "").trim();

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  return BigInt(normalized);
}
