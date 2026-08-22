import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocale } from "@/i18n/locale";
import { LocaleProvider } from "@/i18n/provider";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: "Shinex CRM",
    description: locale === "hy" ? "Շինարարական նախագծերի և ծախսերի կառավարում։" : "Управление строительными проектами и расходами.",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
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
          {children}
          <div className="fixed right-4 top-4 z-50">
            <LanguageSwitcher />
          </div>
          <ThemeToggle />
        </LocaleProvider>
      </body>
    </html>
  );
}
