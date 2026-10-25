"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, ResponsiveDialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useActionLock } from "@/hooks/use-action-lock";
import { useTranslations } from "@/i18n/provider";
import { confirmationHeaders, requestConfirmationCode } from "@/lib/confirmation";
import { externalFundCategories, externalFundCategoryLabels, type ExternalFundEntryType, type ExternalFundEntryView } from "@/lib/external-funds";

export function ExternalFundEntryDialog({ projectId, entry, initialType = "INCOME" }: {
  projectId: string;
  entry?: ExternalFundEntryView;
  initialType?: ExternalFundEntryType;
}) {
  const { t } = useTranslations();
  const router = useRouter();
  const lock = useActionLock();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(entry?.type ?? initialType);
  const [pending, setPending] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientRequestId, setClientRequestId] = useState(() => crypto.randomUUID());
  const endpoint = `/api/projects/${projectId}/external-funds`;
  const label = entry ? t("externalFunds.edit") : initialType === "INCOME" ? t("externalFunds.addIncome") : t("externalFunds.addExpense");

  function changeOpen(value: boolean) {
    if (lock.isLocked()) return;
    setOpen(value);
    setError(null);
    if (value) setType(entry?.type ?? initialType);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lock.acquire()) return;
    const data = new FormData(event.currentTarget);
    setPending("save");
    setError(null);
    try {
      const code = entry ? await requestConfirmationCode("external-fund-update", entry.id, (phrase) => t("confirmation.prompt", { phrase })) : null;
      if (entry && !code) return;
      const response = await fetch(entry ? `${endpoint}/${entry.id}` : endpoint, {
        method: entry ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...(code ? confirmationHeaders(code) : {}) },
        body: JSON.stringify({ ...Object.fromEntries(data), ...(!entry ? { clientRequestId } : {}) }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || t("externalFunds.saveFailed"));
      setOpen(false);
      setClientRequestId(crypto.randomUUID());
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("externalFunds.saveFailed"));
    } finally {
      lock.release();
      setPending(null);
    }
  }

  async function remove() {
    if (!entry || !lock.acquire()) return;
    try {
      if (!window.confirm(t("externalFunds.deleteConfirm"))) return;
      setPending("delete");
      setError(null);
      const code = await requestConfirmationCode("external-fund-delete", entry.id, (phrase) => t("confirmation.prompt", { phrase }));
      if (!code) return;
      const response = await fetch(`${endpoint}/${entry.id}`, { method: "DELETE", headers: confirmationHeaders(code) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || t("externalFunds.deleteFailed"));
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("externalFunds.deleteFailed"));
    } finally {
      lock.release();
      setPending(null);
    }
  }

  const fieldClass = "h-12 w-full rounded-xl border border-input bg-background px-3 text-sm";
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger render={<Button aria-label={label} size={entry ? "icon" : "lg"} variant={entry || initialType === "EXPENSE" ? "outline" : "default"} className="rounded-xl" />}>
      {entry ? <Pencil className="size-4" /> : <>{initialType === "INCOME" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}{label}</>}
    </DialogTrigger>
    <ResponsiveDialogContent className="p-5 sm:p-7">
      <DialogHeader><DialogTitle className="pr-6 text-xl">{label}</DialogTitle><DialogDescription>{t("externalFunds.description")}</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="mt-2 grid gap-5">
        <fieldset disabled={pending !== null} className="grid min-w-0 gap-4 disabled:opacity-70">
          <label className="grid gap-2 text-sm font-medium">{t("externalFunds.operationType")}
            <select name="type" value={type} onChange={(event) => setType(event.target.value as ExternalFundEntryType)} className={fieldClass}>
              <option value="INCOME">{t("externalFunds.income")}</option><option value="EXPENSE">{t("externalFunds.expense")}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">{t("common.amountAmd")}
            <Input required name="amount" inputMode="numeric" pattern="[0-9]+" maxLength={19} defaultValue={entry?.amount} placeholder="0" className="h-14 rounded-xl text-xl font-semibold" />
          </label>
          <label className="grid gap-2 text-sm font-medium">{t("externalFunds.purpose")}
            <Input required name="title" maxLength={200} defaultValue={entry?.title} placeholder={t(type === "INCOME" ? "externalFunds.incomePlaceholder" : "externalFunds.expensePlaceholder")} className={fieldClass} />
          </label>
          {type === "EXPENSE" && <label className="grid gap-2 text-sm font-medium">{t("expense.category")}
            <select required name="category" defaultValue={entry?.category ?? "MATERIAL"} className={fieldClass}>
              {externalFundCategories.map((category) => <option key={category} value={category}>{t(externalFundCategoryLabels[category])}</option>)}
            </select>
          </label>}
          <label className="grid gap-2 text-sm font-medium">{t("common.date")}
            <Input required name="date" type="date" defaultValue={entry?.date.slice(0, 10) ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Yerevan", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())} className={fieldClass} />
          </label>
          <label className="grid gap-2 text-sm font-medium">{t(type === "INCOME" ? "externalFunds.source" : "externalFunds.vendor")} ({t("common.optional")})
            <Input name="counterparty" maxLength={200} defaultValue={entry?.counterparty ?? ""} className={fieldClass} />
          </label>
          <label className="grid gap-2 text-sm font-medium">{t("expense.comment")} ({t("common.optional")})
            <textarea name="notes" maxLength={2000} rows={2} defaultValue={entry?.notes ?? ""} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          </label>
        </fieldset>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          {entry && <Button type="button" variant="destructive" className="h-12 rounded-xl" disabled={pending !== null} loading={pending === "delete"} onClick={() => void remove()}><Trash2 className="size-4" />{t("common.delete")}</Button>}
          <Button type="submit" className="h-12 flex-1 rounded-xl" disabled={pending !== null} loading={pending === "save"}>{t(pending === "save" ? "common.saving" : "common.save")}</Button>
        </div>
      </form>
    </ResponsiveDialogContent>
  </Dialog>;
}
