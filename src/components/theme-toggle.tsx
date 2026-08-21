"use client";

import { Moon, Sun } from "lucide-react";

const storageKey = "shinex-theme";

export function ThemeToggle() {
  function toggleTheme() {
    const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";

    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem(storageKey, nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed right-4 bottom-24 z-50 inline-flex size-10 items-center justify-center rounded-full border bg-card text-foreground shadow-lg transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:bottom-4"
      aria-label="Переключить светлую и тёмную тему"
      title="Переключить тему"
    >
      <Sun className="hidden size-5 dark:block" aria-hidden="true" />
      <Moon className="size-5 dark:hidden" aria-hidden="true" />
    </button>
  );
}
