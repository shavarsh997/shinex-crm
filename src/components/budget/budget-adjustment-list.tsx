"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpToLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/provider";

type BudgetAdjustment = { id: string; type: "INCREASE" | "DECREASE"; amount: string; date: string; notes: string | null };
type PageInfo = { hasNextPage: boolean; nextCursor: string | null };

export function BudgetAdjustmentList({ projectId, initialAdjustments, initialPageInfo, totalCount }: { projectId: string; initialAdjustments: BudgetAdjustment[]; initialPageInfo: PageInfo; totalCount: number }) {
  const { locale, t } = useTranslations();
  const [adjustments, setAdjustments] = useState(initialAdjustments);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!pageInfo.nextCursor) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/budget-adjustments?${new URLSearchParams({ limit: "10", cursor: pageInfo.nextCursor })}`);
      const payload = await response.json().catch(() => null) as { adjustments?: BudgetAdjustment[]; pageInfo?: PageInfo; error?: { message?: string } } | null;
      if (!response.ok || !payload?.adjustments || !payload.pageInfo) throw new Error(payload?.error?.message || t("budget.loadFailed"));
      setAdjustments((current) => [...current, ...payload.adjustments!]);
      setPageInfo(payload.pageInfo);
    } catch (error) {
      alert(error instanceof Error ? error.message : t("budget.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  const money = (amount: string) => `${new Intl.NumberFormat(locale === "hy" ? "hy-AM" : "ru-RU").format(BigInt(amount))} AMD`;

  return <><p className="mt-2 text-sm text-slate-500">{t("common.countChanges", { count: totalCount })}</p><div className="mt-4 overflow-hidden rounded-[22px] bg-white ring-1 ring-slate-200/80">{adjustments.length === 0 ? <div className="px-6 py-14 text-center"><p className="font-semibold text-slate-900">{t("budget.empty")}</p><p className="mt-1 text-sm text-slate-500">{t("budget.emptyDescription")}</p></div> : adjustments.map((adjustment) => { const increased = adjustment.type === "INCREASE"; return <article key={adjustment.id} className="flex items-center justify-between gap-4 border-b border-slate-100 p-4 last:border-0"><div className="flex min-w-0 gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${increased ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{increased ? <ArrowUpToLine className="size-5" /> : <ArrowDownToLine className="size-5" />}</span><div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{increased ? t("budget.increased") : t("budget.decreased")}</p><p className="mt-1 truncate text-xs text-slate-500">{adjustment.notes || new Intl.DateTimeFormat(locale === "hy" ? "hy-AM" : "ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(adjustment.date))}</p></div></div><p className={`shrink-0 font-semibold ${increased ? "text-emerald-600" : "text-amber-600"}`}>{increased ? "+" : "−"}{money(adjustment.amount)}</p></article>; })}</div>{pageInfo.hasNextPage && <div className="mt-4 flex justify-center"><Button variant="outline" className="min-w-40 rounded-xl" disabled={loading} onClick={() => void loadMore()}>{loading ? t("common.loading") : t("common.showMore")}</Button></div>}</>;
}
