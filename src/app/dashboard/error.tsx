"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center"><h1 className="text-lg font-semibold">Не удалось загрузить данные</h1><p className="mt-2 text-sm text-muted-foreground">Попробуйте обновить страницу. Если проблема повторится, проверьте подключение к базе данных.</p><Button className="mt-5" onClick={reset}>Повторить</Button></div>;
}
