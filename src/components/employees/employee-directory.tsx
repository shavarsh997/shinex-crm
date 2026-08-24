"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, ChevronDown, Phone, Plus, UserRound, WalletCards } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, ResponsiveDialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type PayrollEmployee = {
  id: string;
  fullName: string;
  profession: string | null;
  phone: string | null;
  totalPaid: string;
  projects: { id: string; title: string; amount: string }[];
  expenses: { id: string; title: string; amount: string; date: string; project: { id: string; title: string } }[];
};

function money(value: string) {
  return `${new Intl.NumberFormat("ru-RU").format(BigInt(value))} AMD`;
}

function employeeLabel(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return "работник";
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return "работника";
  return "работников";
}

function EmployeeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(data: FormData) {
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message || "Не удалось создать работника.");
      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось создать работника.");
    } finally {
      setPending(false);
    }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<Button size="lg" className="h-12 w-full rounded-2xl bg-slate-950 px-4 text-white shadow-lg shadow-slate-900/15 sm:w-auto" />}><Plus className="size-4" />Добавить работника</DialogTrigger>
    <ResponsiveDialogContent className="gap-5 p-5 pb-8 sm:p-7">
      <DialogHeader><DialogTitle className="text-xl tracking-[-0.035em]">Новый работник</DialogTitle><DialogDescription>Создайте карточку — дальше в ней будут собираться выплаты по проектам.</DialogDescription></DialogHeader>
      <form action={submit} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Имя и фамилия<Input required name="fullName" placeholder="Например, Арман Саргсян" className="h-12 rounded-xl" /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Специальность <span className="font-normal text-slate-400">необязательно</span><Input name="profession" placeholder="Каменщик, электрик…" className="h-12 rounded-xl" /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Телефон <span className="font-normal text-slate-400">необязательно</span><Input name="phone" type="tel" placeholder="+374 …" className="h-12 rounded-xl" /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-700" disabled={pending}>{pending ? "Создаём…" : "Создать работника"}</Button>
      </form>
    </ResponsiveDialogContent>
  </Dialog>;
}

export function EmployeeDirectory({ employees, canCreate }: { employees: PayrollEmployee[]; canCreate: boolean }) {
  const totalPaid = employees.reduce((total, employee) => total + BigInt(employee.totalPaid), 0n);
  return <>
    <section className="mt-6 overflow-hidden rounded-[24px] border border-border bg-card shadow-sm"><div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"><WalletCards className="size-5" /></span><div><p className="text-sm font-medium text-blue-700">Фонд оплаты труда</p><p className="mt-1 text-[32px] font-semibold leading-none tracking-[-0.05em] text-slate-950">{money(totalPaid.toString())}</p><p className="mt-3 max-w-sm text-sm leading-5 text-slate-500">Все выплаты работникам по доступным проектам.</p><p className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{employees.length} {employeeLabel(employees.length)} в базе</p></div></div>{canCreate && <div className="sm:shrink-0"><EmployeeDialog /></div>}</div></section>
    <section className="mt-8"><div><h2 className="text-lg font-semibold">Работники</h2><p className="mt-1 text-sm text-muted-foreground">{employees.length} в списке</p></div><div className="mt-4 grid gap-3">{employees.length === 0 ? <div className="rounded-[22px] bg-card px-6 py-14 text-center ring-1 ring-foreground/10"><UserRound className="mx-auto size-8 text-slate-300" /><p className="mt-3 font-semibold">Работников пока нет</p><p className="mt-1 text-sm text-muted-foreground">Добавьте первого работника, чтобы вести его выплаты по проектам.</p></div> : employees.map((employee) => <article key={employee.id} className="overflow-hidden rounded-[22px] bg-card ring-1 ring-foreground/10"><div className="flex items-start gap-3 p-5"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600"><UserRound className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-950">{employee.fullName}</h3>{employee.profession && <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><BriefcaseBusiness className="size-3.5" />{employee.profession}</p>}{employee.phone && <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><Phone className="size-3.5" />{employee.phone}</p>}</div><div className="text-right"><p className="text-xs text-slate-500">Получил</p><p className="mt-1 font-semibold text-blue-700">{money(employee.totalPaid)}</p></div></div></div></div><details className="border-t border-slate-100"><summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-medium text-slate-700"><ChevronDown className="size-4" />По проектам и выплатам</summary><div className="grid gap-5 border-t border-slate-100 px-5 pb-5 pt-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Проекты</p><div className="mt-2 grid gap-2">{employee.projects.length === 0 ? <p className="text-sm text-slate-500">Выплат пока нет.</p> : employee.projects.map((project) => <div key={project.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm"><span className="min-w-0 truncate text-slate-700">{project.title}</span><span className="shrink-0 font-semibold">{money(project.amount)}</span></div>)}</div></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Последние выплаты</p><div className="mt-2 grid gap-2">{employee.expenses.length === 0 ? <p className="text-sm text-slate-500">Выплат пока нет.</p> : employee.expenses.map((expense) => <div key={expense.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm"><div className="min-w-0"><p className="truncate font-medium text-slate-800">{expense.title}</p><p className="mt-0.5 text-xs text-slate-500">{expense.project.title} · {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(expense.date))}</p></div><span className="shrink-0 font-semibold">{money(expense.amount)}</span></div>)}</div></div></div></details></article>)}</div></section>
  </>;
}
