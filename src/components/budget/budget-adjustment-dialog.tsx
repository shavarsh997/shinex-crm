"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpToLine, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, ResponsiveDialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/i18n/provider";
import { confirmationHeaders, requestConfirmationCode } from "@/lib/confirmation";

type AdjustmentType = "INCREASE" | "DECREASE";

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function BudgetAdjustmentDialog({ projectId }: { projectId: string }) {
  const { t } = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AdjustmentType>("INCREASE");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientRequestId] = useState(() => crypto.randomUUID());

  async function submit(data: FormData) {
    setPending(true);
    setError(null);
    try {
      const code = await requestConfirmationCode("budget-adjust", projectId, (phrase) => t("confirmation.prompt", { phrase }));
      if (!code) return;
      const response = await fetch(`/api/projects/${projectId}/budget-adjustments`, { method: "POST", headers: { "Content-Type": "application/json", ...confirmationHeaders(code) }, body: JSON.stringify({ ...Object.fromEntries(data), clientRequestId }) });
      const payload = await response.json().catch(() => null) as { error?: { message?: string; details?: { message?: string } } } | null;
      if (!response.ok) throw new Error(payload?.error?.details?.message ?? payload?.error?.message ?? t("budget.updateFailed"));
      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("budget.updateFailed"));
    } finally {
      setPending(false);
    }
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setError(null); }}>
    <DialogTrigger render={<Button size="lg" className="h-12 rounded-2xl bg-blue-600 px-4 shadow-lg shadow-blue-600/20 hover:bg-blue-700" />}><Plus className="size-4" />{t("budget.adjust")}</DialogTrigger>
    <ResponsiveDialogContent className="p-5 pb-8 sm:p-7"><DialogHeader><DialogTitle className="text-xl tracking-[-0.035em]">{t("budget.adjustTitle")}</DialogTitle><DialogDescription>{t("budget.adjustDescription")}</DialogDescription></DialogHeader><form action={submit} className="mt-5 grid gap-5"><input name="type" type="hidden" value={type} /><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setType("INCREASE")} className={`flex h-20 flex-col items-start justify-center rounded-2xl border px-4 text-left transition ${type === "INCREASE" ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100" : "border-slate-200 text-slate-600"}`}><ArrowUpToLine className="size-5" /><span className="mt-1 text-sm font-semibold">{t("budget.increase")}</span></button><button type="button" onClick={() => setType("DECREASE")} className={`flex h-20 flex-col items-start justify-center rounded-2xl border px-4 text-left transition ${type === "DECREASE" ? "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-100" : "border-slate-200 text-slate-600"}`}><ArrowDownToLine className="size-5" /><span className="mt-1 text-sm font-semibold">{t("budget.decrease")}</span></button></div><label className="grid gap-2 text-sm font-semibold text-slate-700">{t("budget.adjustAmount")}<Input required name="amount" inputMode="numeric" placeholder="0" className="h-14 rounded-2xl text-xl font-semibold" /></label><label className="grid gap-2 text-sm font-semibold text-slate-700">{t("common.date")}<Input required name="date" type="date" defaultValue={today()} className="h-12 rounded-2xl" /></label><label className="grid gap-2 text-sm font-semibold text-slate-700">{t("budget.reason")} <span className="font-normal text-slate-400">({t("common.optional")})</span><textarea name="notes" rows={3} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-blue-100" placeholder={t("budget.reasonPlaceholder")} /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" size="lg" className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-700" disabled={pending}>{pending ? t("common.saving") : type === "INCREASE" ? t("budget.increaseAction") : t("budget.decreaseAction")}</Button></form></ResponsiveDialogContent>
  </Dialog>;
}
