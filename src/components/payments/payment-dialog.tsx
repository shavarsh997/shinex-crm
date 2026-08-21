"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, ResponsiveDialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function PaymentDialog({ projectId, compact = false }: { projectId: string; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(data: FormData) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "Не удалось сохранить поступление.");
      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось сохранить поступление.");
    } finally {
      setPending(false);
    }
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setError(null); }}>
    <DialogTrigger render={<Button size={compact ? "icon" : "lg"} className={compact ? "size-12 rounded-2xl bg-emerald-600 text-white" : "h-12 rounded-2xl bg-emerald-600 px-4 text-white hover:bg-emerald-700"} />}><CircleDollarSign className="size-4" />{!compact && "Добавить поступление"}</DialogTrigger>
    <ResponsiveDialogContent className="p-5 pb-8 sm:p-7"><DialogHeader><DialogTitle className="text-xl tracking-[-0.035em]">Новое поступление</DialogTitle><DialogDescription>Укажите, сколько денег поступило от клиента или работодателя. Поступление обновит баланс проекта.</DialogDescription></DialogHeader><form action={submit} className="mt-5 grid gap-5"><label className="grid gap-2 text-sm font-semibold text-slate-700">Сумма, AMD<Input required name="amount" inputMode="numeric" placeholder="0" className="h-14 rounded-2xl text-xl font-semibold" /></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Дата<Input required name="date" type="date" defaultValue={today()} className="h-12 rounded-2xl" /></label><label className="grid gap-2 text-sm font-semibold text-slate-700">От кого поступление <span className="font-normal text-slate-400">(необязательно)</span><textarea name="notes" rows={3} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-blue-100" placeholder="Например: оплата от клиента за этап работ" /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" size="lg" className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={pending}><Plus className="size-4" />{pending ? "Сохраняем…" : "Сохранить поступление"}</Button></form></ResponsiveDialogContent>
  </Dialog>;
}
