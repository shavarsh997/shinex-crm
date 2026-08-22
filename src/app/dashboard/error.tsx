"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/provider";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslations();
  return <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center"><h1 className="text-lg font-semibold">{t("error.dashboardTitle")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("error.dashboardDescription")}</p><Button className="mt-5" onClick={reset}>{t("common.retry")}</Button></div>;
}
