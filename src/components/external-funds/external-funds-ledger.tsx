"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, RotateCcw, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActionLock } from "@/hooks/use-action-lock";
import { useTranslations } from "@/i18n/provider";
import { localeToIntl } from "@/i18n/config";
import { confirmationHeaders, requestConfirmationCode } from "@/lib/confirmation";
import { externalFundCategoryLabels, type ExternalFundEntryView } from "@/lib/external-funds";
import { formatMoney } from "@/lib/money";
import { ExternalFundEntryDialog } from "./external-fund-entry-dialog";

export function ExternalFundsLedger({ projectId, entries, canEdit }: { projectId: string; entries: ExternalFundEntryView[]; canEdit: boolean }) {
  const { locale, t } = useTranslations();
  const router = useRouter();
  const lock = useActionLock();
  const [filter, setFilter] = useState("ALL");
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visible = entries.filter((entry) => filter === "DELETED" ? entry.deletedAt !== null : !entry.deletedAt && (filter === "ALL" || entry.type === filter));

  async function restore(entryId: string) {
    if (!lock.acquire()) return;
    setRestoring(entryId);
    setError(null);
    try {
      const code = await requestConfirmationCode("external-fund-restore", entryId, (phrase) => t("confirmation.prompt", { phrase }));
      if (!code) return;
      const response = await fetch(`/api/projects/${projectId}/external-funds/${entryId}/restore`, { method: "POST", headers: confirmationHeaders(code) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || t("externalFunds.restoreFailed"));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("externalFunds.restoreFailed"));
    } finally {
      lock.release();
      setRestoring(null);
    }
  }

  return <section className="mt-8">
    {canEdit && <div className="mb-7 flex flex-wrap gap-3"><ExternalFundEntryDialog projectId={projectId} /><ExternalFundEntryDialog projectId={projectId} initialType="EXPENSE" /></div>}
    {!canEdit && <p className="mb-5 text-sm text-muted-foreground">{t("externalFunds.readOnly")}</p>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-lg font-semibold">{t("externalFunds.history")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("common.countRecords", { count: visible.length })}</p></div>
      <select aria-label={t("externalFunds.filter")} value={filter} onChange={(event) => setFilter(event.target.value)} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
        <option value="ALL">{t("externalFunds.all")}</option><option value="INCOME">{t("externalFunds.incomes")}</option><option value="EXPENSE">{t("externalFunds.expenses")}</option><option value="DELETED">{t("externalFunds.deleted")}</option>
      </select>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    <div className="mt-4 overflow-hidden rounded-[22px] bg-card ring-1 ring-border">
      {visible.length === 0 ? <div className="px-6 py-12 text-center"><WalletCards className="mx-auto size-8 text-muted-foreground" /><p className="mt-4 font-semibold">{t(filter === "ALL" ? "externalFunds.empty" : "externalFunds.emptyFilter")}</p>{filter === "ALL" && <p className="mt-2 text-sm text-muted-foreground">{t("externalFunds.emptyDescription")}</p>}</div> : visible.map((entry) => <article key={entry.id} className="flex flex-wrap items-start gap-3 border-b border-border p-4 last:border-0 sm:flex-nowrap">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${entry.type === "INCOME" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>{entry.type === "INCOME" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}</span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold">{entry.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat(localeToIntl(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(entry.date))} · {entry.category ? t(externalFundCategoryLabels[entry.category]) : t("externalFunds.income")}</p>
          {entry.counterparty && <p className="mt-1 break-words text-xs text-muted-foreground">{entry.counterparty}</p>}
          {entry.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{entry.notes}</p>}
          {entry.deletedAt && <p className="mt-2 text-xs text-destructive">{t("externalFunds.deletedEntry")}</p>}
        </div>
        <div className="flex w-full items-center justify-end gap-2 pl-12 sm:w-auto sm:pl-0">
          <p className={`break-all text-right text-sm font-semibold ${entry.deletedAt ? "text-muted-foreground line-through" : entry.type === "INCOME" ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>{entry.type === "INCOME" ? "+" : "−"}{formatMoney(entry.amount, locale)}</p>
          {canEdit && (entry.deletedAt ? <Button variant="outline" size="icon" aria-label={t("externalFunds.restore")} title={t("externalFunds.restore")} disabled={restoring !== null} loading={restoring === entry.id} onClick={() => void restore(entry.id)}><RotateCcw className="size-4" /></Button> : <ExternalFundEntryDialog projectId={projectId} entry={entry} />)}
        </div>
      </article>)}
    </div>
  </section>;
}
