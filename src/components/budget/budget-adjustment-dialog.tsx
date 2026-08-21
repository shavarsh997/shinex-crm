"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpToLine, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, ResponsiveDialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type AdjustmentType = "INCREASE" | "DECREASE";

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function BudgetAdjustmentDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AdjustmentType>("INCREASE");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(data: FormData) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/budget-adjustments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
      const payload = await response.json().catch(() => null) as { error?: { message?: string; details?: { message?: string } } } | null;
      if (!response.ok) throw new Error(payload?.error?.details?.message ?? payload?.error?.message ?? "Не удалось изменить бюджет.");
      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось изменить бюджет.");
    } finally {
      setPending(false);
    }
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setError(null); }}>
    <DialogTrigger render={<Button size="lg" className="h-12 rounded-2xl bg-blue-600 px-4 shadow-lg shadow-blue-600/20 hover:bg-blue-700" />}><Plus className="size-4" />Изменить бюджет</DialogTrigger>
    <ResponsiveDialogContent className="p-5 pb-8 sm:p-7"><DialogHeader><DialogTitle className="text-xl tracking-[-0.035em]">Корректировка бюджета</DialogTitle><DialogDescription>Изменение сохранится в истории и сразу обновит бюджет проекта.</DialogDescription></DialogHeader><form action={submit} className="mt-5 grid gap-5"><input name="type" type="hidden" value={type} /><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setType("INCREASE")} className={`flex h-20 flex-col items-start justify-center rounded-2xl border px-4 text-left transition ${type === "INCREASE" ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100" : "border-slate-200 text-slate-600"}`}><ArrowUpToLine className="size-5" /><span className="mt-1 text-sm font-semibold">Увеличить</span></button><button type="button" onClick={() => setType("DECREASE")} className={`flex h-20 flex-col items-start justify-center rounded-2xl border px-4 text-left transition ${type === "DECREASE" ? "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-100" : "border-slate-200 text-slate-600"}`}><ArrowDownToLine className="size-5" /><span className="mt-1 text-sm font-semibold">Уменьшить</span></button></div><label className="grid gap-2 text-sm font-semibold text-slate-700">Сумма изменения, AMD<Input required name="amount" inputMode="numeric" placeholder="0" className="h-14 rounded-2xl text-xl font-semibold" /></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Дата<Input required name="date" type="date" defaultValue={today()} className="h-12 rounded-2xl" /></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Причина изменения <span className="font-normal text-slate-400">(необязательно)</span><textarea name="notes" rows={3} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-blue-100" placeholder="Например: дополнительный объём работ" /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" size="lg" className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-700" disabled={pending}>{pending ? "Сохраняем…" : type === "INCREASE" ? "Увеличить бюджет" : "Уменьшить бюджет"}</Button></form></ResponsiveDialogContent>
  </Dialog>;
}
