"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, ReceiptText, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, ResponsiveDialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ExpenseView } from "./expense-list";

const types = [
  { value: "EMPLOYEE", label: "Зарплата" },
  { value: "MATERIAL", label: "Материалы" },
  { value: "FUEL", label: "Топливо" },
  { value: "TRANSPORT", label: "Транспорт" },
  { value: "EQUIPMENT", label: "Оборудование" },
  { value: "SERVICE", label: "Услуги" },
  { value: "OTHER", label: "Другое" },
] as const;

export function ExpenseDialog({ projectId, expense, open, onOpenChange, compact = false }: { projectId: string; expense?: ExpenseView; open?: boolean; onOpenChange?: (open: boolean) => void; compact?: boolean }) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [type, setType] = useState<ExpenseView["type"]>(expense?.type ?? "MATERIAL");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isOpen = open ?? internalOpen;
  const isSalary = type === "EMPLOYEE";
  const date = expense?.date.slice(0, 10) || new Date().toISOString().slice(0, 10);

  function changeOpen(value: boolean) {
    setInternalOpen(value);
    onOpenChange?.(value);
    if (!value) setError(null);
  }

  async function submit(data: FormData) {
    setError(null);
    setPending(true);
    try {
      const url = expense ? `/api/expenses/${expense.id}` : `/api/projects/${projectId}/expenses`;
      const response = await fetch(url, { method: expense ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
      const payload = await response.json().catch(() => null) as { error?: { message: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message || "Не удалось сохранить расход.");
      changeOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось сохранить расход.");
    } finally {
      setPending(false);
    }
  }

  return <Dialog open={isOpen} onOpenChange={changeOpen}>
    {!expense && <DialogTrigger render={<Button size={compact ? "icon" : "lg"} className={compact ? "size-12 rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20 dark:bg-primary dark:text-primary-foreground" : "h-12 rounded-2xl bg-slate-950 px-4 text-sm text-white shadow-lg shadow-slate-900/15 dark:bg-primary dark:text-primary-foreground"} />}><Plus className="size-4" />{!compact && "Добавить расход"}</DialogTrigger>}
    <ResponsiveDialogContent className="gap-5 p-5 pb-8 sm:p-7">
      <DialogHeader><DialogTitle className="text-xl tracking-[-0.035em]">{expense ? "Изменить расход" : "Новый расход"}</DialogTitle><DialogDescription>{isSalary ? "Укажите сумму и сотрудника, который получил зарплату." : "Заполните главное — детали можно добавить позже."}</DialogDescription></DialogHeader>
      <form action={submit} className="grid gap-5">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">Сумма, AMD<div className="relative"><Input required name="amount" inputMode="numeric" defaultValue={expense?.amount} placeholder="0" className="h-16 rounded-2xl border-slate-200 pr-14 text-3xl font-semibold tracking-[-0.05em]" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">AMD</span></div></label>
        <div><p className="mb-2 text-sm font-semibold text-slate-700">Категория</p><label className="relative block"><select name="type" value={type} onChange={(event) => setType(event.target.value as ExpenseView["type"])} className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:ring-3 focus:ring-blue-100">{types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><ReceiptText className="pointer-events-none absolute right-4 top-3.5 size-5 text-slate-400" /></label></div>
        {isSalary && <label className="grid gap-2 text-sm font-semibold text-slate-700">Сотрудник, получивший зарплату<div className="relative"><Input required name="employeeName" defaultValue={expense?.employeeName || ""} placeholder="Имя и фамилия сотрудника" className="h-12 rounded-2xl border-slate-200 pl-11" /><UserRound className="pointer-events-none absolute left-4 top-3.5 size-5 text-slate-400" /></div></label>}
        {!isSalary && <Input name="employeeName" defaultValue="" className="hidden" />}
        <label className="grid gap-2 text-sm font-semibold text-slate-700">Описание<Input required name="title" defaultValue={expense?.title} placeholder={isSalary ? "Например: зарплата за август" : "На что потратили?"} className="h-12 rounded-2xl border-slate-200 px-4" /></label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">Дата<div className="relative"><Input required name="date" type="date" defaultValue={date} className="h-12 rounded-2xl border-slate-200 px-4" /><CalendarDays className="pointer-events-none absolute right-4 top-3.5 size-5 text-slate-400" /></div></label>
        <details className="rounded-2xl bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Поставщик и комментарий</summary><div className="mt-4 grid gap-4">{!isSalary && <label className="grid gap-1.5 text-sm font-medium">Поставщик / получатель<Input name="vendorName" defaultValue={expense?.vendorName || ""} className="h-11 rounded-xl border-slate-200" /></label>}{isSalary && <Input name="vendorName" defaultValue="" className="hidden" />}<label className="grid gap-1.5 text-sm font-medium">Комментарий<textarea name="description" defaultValue={expense?.description || ""} rows={2} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-blue-100" /></label><Input name="notes" defaultValue={expense?.notes || ""} className="hidden" /></div></details>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="h-13 rounded-2xl bg-blue-600 text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700" disabled={pending}>{pending ? "Сохраняем…" : expense ? "Сохранить изменения" : "Сохранить расход"}</Button>
      </form>
    </ResponsiveDialogContent>
  </Dialog>;
}
