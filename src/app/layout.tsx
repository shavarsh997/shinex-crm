import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

import { TelegramWebAppBootstrap } from "@/components/telegram/telegram-web-app";
import { getLocale } from "@/i18n/locale";
import { LocaleProvider } from "@/i18n/provider";
import { scheduleTelegramIntegrationSync } from "@/server/modules/telegram/telegram-sync-schedule";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: "Shinex CRM",
    description: locale === "hy" ? "Շինարարական նախագծերի և ծախսերի կառավարում։" : "Управление строительными проектами и расходами.",
    icons: {
      icon: "/icon.svg",
      shortcut: "/icon.svg",
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  scheduleTelegramIntegrationSync();
  return (
    <html
      lang={locale}
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){try{var theme=localStorage.getItem('shinex-theme');var dark=theme?theme==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',dark)}catch(error){}})()",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Script src="https://telegram.org/js/telegram-web-app.js?58" strategy="beforeInteractive" />
        <LocaleProvider locale={locale}>
          <TelegramWebAppBootstrap />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
