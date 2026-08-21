"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function today() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function PaymentDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(data: FormData) {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось сохранить платёж.");
      }

      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось сохранить платёж.");
    } finally {
      setPending(false);
    }
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setError(null); }}><DialogTrigger render={<button type="button" className="flex flex-col items-center gap-2" />}><span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CircleDollarSign className="size-5" /></span><span className="text-[11px] font-medium text-slate-600">Платёж</span></DialogTrigger><DialogContent className="bottom-0 top-auto max-w-none translate-y-0 rounded-b-none rounded-t-[28px] p-5 pb-8 sm:bottom-1/2 sm:max-w-lg sm:-translate-y-1/2 sm:rounded-[28px] sm:p-7"><DialogHeader><DialogTitle className="text-xl tracking-[-0.035em]">Платёж клиента</DialogTitle><DialogDescription>Поступление сохранится отдельной записью и обновит баланс проекта.</DialogDescription></DialogHeader><form action={submit} className="mt-5 grid gap-5"><label className="grid gap-2 text-sm font-semibold text-slate-700">Сумма, AMD<Input required name="amount" inputMode="numeric" placeholder="0" className="h-14 rounded-2xl text-xl font-semibold" /></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Дата<Input required name="date" type="date" defaultValue={today()} className="h-12 rounded-2xl" /></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Комментарий <span className="font-normal text-slate-400">(необязательно)</span><textarea name="notes" rows={3} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-blue-100" placeholder="Например: перевод на расчётный счёт" /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" size="lg" className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={pending}><Plus className="size-4" />{pending ? "Сохраняем…" : "Сохранить платёж"}</Button></form></DialogContent></Dialog>;
}
