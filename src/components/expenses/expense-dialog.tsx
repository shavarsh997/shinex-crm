"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, ReceiptText, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, ResponsiveDialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/i18n/provider";
import { confirmationHeaders, requestConfirmationCode } from "@/lib/confirmation";
import type { EmployeeOption, ExpenseView } from "./expense-list";

export function ExpenseDialog({ projectId, employees, expense, open, onOpenChange, compact = false }: { projectId: string; employees: EmployeeOption[]; expense?: ExpenseView; open?: boolean; onOpenChange?: (open: boolean) => void; compact?: boolean }) {
  const { t } = useTranslations();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [type, setType] = useState<ExpenseView["type"]>(expense?.type ?? "MATERIAL");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [clientRequestId] = useState(() => crypto.randomUUID());
  const isOpen = open ?? internalOpen;
  const isSalary = type === "EMPLOYEE";
  const date = expense?.date.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const types = [
    { value: "EMPLOYEE", label: t("expense.employeeType") }, { value: "MATERIAL", label: t("expense.material") }, { value: "FUEL", label: t("expense.fuel") }, { value: "TRANSPORT", label: t("expense.transport") }, { value: "EQUIPMENT", label: t("expense.equipment") }, { value: "SERVICE", label: t("expense.service") }, { value: "OTHER", label: t("expense.other") },
  ] as const;

  function changeOpen(value: boolean) {
    setInternalOpen(value);
    onOpenChange?.(value);
    if (!value) setError(null);
  }

  async function submit(data: FormData) {
    setError(null);
    setPending(true);
    try {
      const code = expense
        ? await requestConfirmationCode("expense-update", expense.id, (phrase) => t("confirmation.prompt", { phrase }))
        : null;
      if (expense && !code) return;
      const url = expense ? `/api/expenses/${expense.id}` : `/api/projects/${projectId}/expenses`;
      const response = await fetch(url, { method: expense ? "PATCH" : "POST", headers: { "Content-Type": "application/json", ...(code ? confirmationHeaders(code) : {}) }, body: JSON.stringify(Object.fromEntries(data)) });
      const payload = await response.json().catch(() => null) as { error?: { message: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message || t("expense.saveFailed"));
      changeOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("expense.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  return <Dialog open={isOpen} onOpenChange={changeOpen}>
    {!expense && <DialogTrigger render={<Button size={compact ? "icon" : "lg"} className={compact ? "size-12 rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20 dark:bg-primary dark:text-primary-foreground" : "h-12 rounded-2xl bg-slate-950 px-4 text-sm text-white shadow-lg shadow-slate-900/15 dark:bg-primary dark:text-primary-foreground"} />}><Plus className="size-4" />{!compact && t("expense.add")}</DialogTrigger>}
    <ResponsiveDialogContent className="gap-5 p-5 pb-8 sm:p-7">
      <DialogHeader><DialogTitle className="text-xl tracking-[-0.035em]">{expense ? t("expense.edit") : t("expense.new")}</DialogTitle><DialogDescription>{isSalary ? t("expense.salaryDescription") : t("expense.defaultDescription")}</DialogDescription></DialogHeader>
      <form action={submit} className="grid gap-5">
        {!expense && <input name="clientRequestId" type="hidden" value={clientRequestId} />}
        <label className="grid gap-2 text-sm font-semibold text-slate-700">{t("common.amountAmd")}<div className="relative"><Input required name="amount" inputMode="numeric" defaultValue={expense?.amount} placeholder="0" className="h-16 rounded-2xl border-slate-200 pr-14 text-3xl font-semibold tracking-[-0.05em]" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">AMD</span></div></label>
        <div><p className="mb-2 text-sm font-semibold text-slate-700">{t("expense.category")}</p><label className="relative block"><select name="type" value={type} onChange={(event) => setType(event.target.value as ExpenseView["type"])} className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:ring-3 focus:ring-blue-100">{types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><ReceiptText className="pointer-events-none absolute right-4 top-3.5 size-5 text-slate-400" /></label></div>
        {isSalary && <label className="grid gap-2 text-sm font-semibold text-slate-700">{t("expense.employee")}<div className="relative"><select required name="employeeId" defaultValue={expense?.employeeId || ""} disabled={employees.length === 0} className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-11 text-sm outline-none focus:ring-3 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"><option value="">{employees.length ? t("expense.selectEmployee") : t("expense.createEmployeeFirst")}</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}{employee.profession ? ` · ${employee.profession}` : ""}</option>)}</select><UserRound className="pointer-events-none absolute left-4 top-3.5 size-5 text-slate-400" /></div>{employees.length === 0 && <span className="text-xs font-normal text-slate-500">{t("expense.employeeHint")}</span>}</label>}
        <Input name="employeeName" defaultValue="" className="hidden" />
        <label className="grid gap-2 text-sm font-semibold text-slate-700">{t("form.description")}<Input required name="title" defaultValue={expense?.title} placeholder={isSalary ? t("expense.salaryPlaceholder") : t("expense.titlePlaceholder")} className="h-12 rounded-2xl border-slate-200 px-4" /></label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">{t("common.date")}<div className="relative"><Input required name="date" type="date" defaultValue={date} className="h-12 rounded-2xl border-slate-200 px-4" /><CalendarDays className="pointer-events-none absolute right-4 top-3.5 size-5 text-slate-400" /></div></label>
        <details className="rounded-2xl bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-700">{t("expense.vendorDetails")}</summary><div className="mt-4 grid gap-4">{!isSalary && <label className="grid gap-1.5 text-sm font-medium">{t("expense.vendor")}<Input name="vendorName" defaultValue={expense?.vendorName || ""} className="h-11 rounded-xl border-slate-200" /></label>}{isSalary && <Input name="vendorName" defaultValue="" className="hidden" />}<label className="grid gap-1.5 text-sm font-medium">{t("expense.comment")}<textarea name="description" defaultValue={expense?.description || ""} rows={2} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-blue-100" /></label><Input name="notes" defaultValue={expense?.notes || ""} className="hidden" /></div></details>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="h-13 rounded-2xl bg-blue-600 text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700" disabled={pending}>{pending ? t("common.saving") : expense ? t("payment.saveChanges") : t("expense.save")}</Button>
      </form>
    </ResponsiveDialogContent>
  </Dialog>;
}
