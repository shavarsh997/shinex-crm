import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownToLine, ArrowLeft, ArrowUpToLine, WalletCards } from "lucide-react";

import { BudgetAdjustmentDialog } from "@/components/budget/budget-adjustment-dialog";
import { getAuthenticatedUser } from "@/server/auth";
import { getUserProject } from "@/server/modules/projects/projects.service";
import { NotFoundError } from "@/server/shared/errors";

export default async function ProjectBudgetPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthenticatedUser();
  const { projectId } = await params;
  let project;
  try {
    project = await getUserProject(user.id, projectId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const remaining = project.estimatedAmount - project.spentAmount;
  const money = (amount: bigint) => `${new Intl.NumberFormat("ru-RU").format(amount)} AMD`;
  const canEditProject = project.canEdit;

  return <div className="mx-auto max-w-4xl px-5 pb-28 pt-5 sm:px-8 sm:pt-8"><header className="flex items-center gap-3"><Link href={`/dashboard/projects/${project.id}`} aria-label="Вернуться к проекту" className="grid size-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"><ArrowLeft className="size-5" /></Link><div><p className="text-xs text-slate-400">{project.title}</p><h1 className="text-xl font-semibold tracking-[-0.035em] text-slate-950">Бюджет</h1></div></header><section className="mt-6 overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-[0_16px_36px_rgba(15,23,42,0.22)]"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-blue-100">Текущий бюджет</p><p className="mt-2 text-3xl font-semibold tracking-[-0.06em]">{money(project.estimatedAmount)}</p></div><span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-blue-100"><WalletCards className="size-5" /></span></div><div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"><div><p className="text-[10px] text-slate-400">Уже потрачено</p><p className="mt-1 text-sm font-semibold">{money(project.spentAmount)}</p></div><div><p className="text-[10px] text-slate-400">Свободно по смете</p><p className="mt-1 text-sm font-semibold">{money(remaining)}</p></div></div></section><section className="mt-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Изменения бюджета</h2><p className="mt-1 text-sm text-slate-500">Увеличения и уменьшения сметы сохраняются в истории.</p></div>{canEditProject && <BudgetAdjustmentDialog projectId={project.id} />}</div><div className="mt-4 overflow-hidden rounded-[22px] bg-white ring-1 ring-slate-200/80">{project.budgetAdjustments.length === 0 ? <div className="px-6 py-14 text-center"><p className="font-semibold text-slate-900">Изменений пока нет</p><p className="mt-1 text-sm text-slate-500">Добавьте корректировку, если бюджет проекта увеличился или уменьшился.</p></div> : project.budgetAdjustments.map((adjustment) => { const increased = adjustment.type === "INCREASE"; return <article key={adjustment.id} className="flex items-center justify-between gap-4 border-b border-slate-100 p-4 last:border-0"><div className="flex min-w-0 gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${increased ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{increased ? <ArrowUpToLine className="size-5" /> : <ArrowDownToLine className="size-5" />}</span><div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{increased ? "Бюджет увеличен" : "Бюджет уменьшен"}</p><p className="mt-1 truncate text-xs text-slate-500">{adjustment.notes || new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(adjustment.date)}</p></div></div><p className={`shrink-0 font-semibold ${increased ? "text-emerald-600" : "text-amber-600"}`}>{increased ? "+" : "−"}{money(adjustment.amount)}</p></article>; })}</div></section></div>;
}
