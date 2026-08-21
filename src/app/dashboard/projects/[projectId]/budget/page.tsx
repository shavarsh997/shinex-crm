import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, WalletCards } from "lucide-react";

import { BudgetAdjustmentDialog } from "@/components/budget/budget-adjustment-dialog";
import { BudgetAdjustmentList } from "@/components/budget/budget-adjustment-list";
import { getAuthenticatedUser } from "@/server/auth";
import { getProjectBudgetAdjustmentPage } from "@/server/modules/budget/budget.service";
import { getUserProjectSummary } from "@/server/modules/projects/projects.service";
import { NotFoundError } from "@/server/shared/errors";

export default async function ProjectBudgetPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthenticatedUser();
  const { projectId } = await params;
  let project;
  try {
    project = await getUserProjectSummary(user.id, projectId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const remaining = project.estimatedAmount - project.spentAmount;
  const money = (amount: bigint) => `${new Intl.NumberFormat("ru-RU").format(amount)} AMD`;
  const canEditProject = project.canEdit && project.status === "ACTIVE";
  const adjustmentPage = await getProjectBudgetAdjustmentPage(user.id, projectId, { limit: 10 });
  const adjustments = adjustmentPage.data.map((adjustment) => ({ id: adjustment.id, type: adjustment.type, amount: adjustment.amount.toString(), date: adjustment.date.toISOString(), notes: adjustment.notes }));

  return <div className="mx-auto max-w-4xl px-5 pb-28 pt-5 sm:px-8 sm:pt-8"><header className="flex items-center gap-3"><Link href={`/dashboard/projects/${project.id}`} aria-label="Вернуться к проекту" className="grid size-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"><ArrowLeft className="size-5" /></Link><div><p className="text-xs text-slate-400">{project.title}</p><h1 className="text-xl font-semibold tracking-[-0.035em] text-slate-950">Бюджет</h1></div></header><section className="mt-6 overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-[0_16px_36px_rgba(15,23,42,0.22)]"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-blue-100">Текущий бюджет</p><p className="mt-2 text-3xl font-semibold tracking-[-0.06em]">{money(project.estimatedAmount)}</p></div><span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-blue-100"><WalletCards className="size-5" /></span></div><div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"><div><p className="text-[10px] text-slate-400">Уже потрачено</p><p className="mt-1 text-sm font-semibold">{money(project.spentAmount)}</p></div><div><p className="text-[10px] text-slate-400">Свободно по смете</p><p className="mt-1 text-sm font-semibold">{money(remaining)}</p></div></div></section><section className="mt-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Изменения бюджета</h2><p className="mt-1 text-sm text-slate-500">Увеличения и уменьшения сметы сохраняются в истории.</p></div>{canEditProject && <BudgetAdjustmentDialog projectId={project.id} />}</div><BudgetAdjustmentList key={`${adjustmentPage.totalCount}-${adjustments.map((adjustment) => adjustment.id).join("-")}`} projectId={project.id} initialAdjustments={adjustments} initialPageInfo={adjustmentPage.pageInfo} totalCount={adjustmentPage.totalCount} /></section></div>;
}
