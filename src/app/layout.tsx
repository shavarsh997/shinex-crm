import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

import { ThemeToggle } from "@/components/theme-toggle";

const manrope = Manrope({
  subsets: ["cyrillic", "latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Shinex CRM",
  description: "Управление строительными проектами и расходами.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){try{var theme=localStorage.getItem('shinex-theme');document.documentElement.classList.toggle('dark',theme==='dark')}catch(error){}})()",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
