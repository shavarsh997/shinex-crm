"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, ResponsiveDialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/i18n/provider";

export type PaymentView = {
  id: string;
  amount: string;
  date: string;
  notes: string | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function PaymentDialog({ projectId, payment, compact = false }: {
  projectId: string;
  payment?: PaymentView;
  compact?: boolean;
}) {
  const { t } = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientRequestId] = useState(() => crypto.randomUUID());
  const isEditing = Boolean(payment);

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setError(null);
  }

  async function submit(data: FormData) {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(
        payment ? `/api/payments/${payment.id}` : `/api/projects/${projectId}/payments`,
        {
          method: payment ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(data)),
        },
      );
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? t("payment.saveFailed"));

      changeOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("payment.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!payment || !window.confirm(t("payment.deleteConfirm"))) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/payments/${payment.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? t("payment.deleteFailed"));

      changeOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("payment.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger render={<Button aria-label={isEditing ? t("payment.edit") : t("payment.add")} size={compact ? "icon" : "lg"} variant={isEditing ? "ghost" : "default"} className={isEditing ? "size-9 rounded-xl text-slate-500 hover:text-slate-950" : compact ? "size-12 rounded-2xl bg-emerald-600 text-white" : "h-12 w-full justify-center rounded-2xl bg-emerald-600 px-4 text-white hover:bg-emerald-700 sm:w-auto"} />}>
      {isEditing ? <Pencil className="size-4" /> : <><CircleDollarSign className="size-4" />{!compact && t("payment.add")}</>}
    </DialogTrigger>
    <ResponsiveDialogContent className="p-5 pb-8 sm:p-7">
      <DialogHeader>
        <DialogTitle className="text-xl tracking-[-0.035em]">{isEditing ? t("payment.edit") : t("payment.new")}</DialogTitle>
        <DialogDescription>{t("payment.description")}</DialogDescription>
      </DialogHeader>
      <form action={submit} className="mt-5 grid gap-5">
        {!payment && <input name="clientRequestId" type="hidden" value={clientRequestId} />}
        <label className="grid gap-2 text-sm font-semibold text-slate-700">{t("common.amountAmd")}<Input required name="amount" inputMode="numeric" defaultValue={payment?.amount} placeholder="0" className="h-14 rounded-2xl text-xl font-semibold" /></label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">{t("common.date")}<Input required name="date" type="date" defaultValue={payment?.date.slice(0, 10) || today()} className="h-12 rounded-2xl" /></label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">{t("payment.source")} <span className="font-normal text-slate-400">({t("common.optional")})</span><textarea name="notes" defaultValue={payment?.notes || ""} rows={3} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-blue-100" placeholder={t("payment.sourcePlaceholder")} /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          {isEditing && <Button type="button" variant="destructive" size="lg" className="h-12 rounded-2xl" disabled={pending || deleting} onClick={() => void remove()}><Trash2 className="size-4" />{deleting ? t("common.deleting") : t("common.delete")}</Button>}
          <Button type="submit" size="lg" className="h-12 flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={pending || deleting}>{pending ? t("common.saving") : isEditing ? t("payment.saveChanges") : t("payment.save")}</Button>
        </div>
      </form>
    </ResponsiveDialogContent>
  </Dialog>;
}
