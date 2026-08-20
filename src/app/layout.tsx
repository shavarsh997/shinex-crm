import type { Metadata } from "next";
import "./globals.css";

import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Shinex CRM",
  description: "Управление строительными проектами и расходами.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className="h-full antialiased"
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
