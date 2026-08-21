import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ReceiptText } from "lucide-react";

import { ExpenseList, type ExpenseView } from "@/components/expenses/expense-list";
import { getAuthenticatedUser } from "@/server/auth";
import { getProjectExpensePage } from "@/server/modules/expenses/expenses.service";
import { getUserProjectSummary } from "@/server/modules/projects/projects.service";
import { NotFoundError } from "@/server/shared/errors";

export default async function ProjectExpensesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthenticatedUser();
  const { projectId } = await params;
  let project;
  try {
    project = await getUserProjectSummary(user.id, projectId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const expensePage = await getProjectExpensePage(user.id, projectId, { limit: 10 }, undefined, "newest");
  const expenses: ExpenseView[] = expensePage.data.map((expense) => ({ id: expense.id, type: expense.type, title: expense.title, amount: expense.amount.toString(), date: expense.date.toISOString(), description: expense.description, employeeName: expense.employeeName, vendorName: expense.vendorName, notes: expense.notes }));
  const money = `${new Intl.NumberFormat("ru-RU").format(project.spentAmount)} AMD`;

  return <div className="mx-auto max-w-4xl px-5 pb-28 pt-5 sm:px-8 sm:pt-8"><header className="flex items-center gap-3"><Link href={`/dashboard/projects/${project.id}`} aria-label="Вернуться к проекту" className="grid size-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"><ArrowLeft className="size-5" /></Link><div><p className="text-xs text-slate-400">{project.title}</p><h1 className="text-xl font-semibold tracking-[-0.035em] text-slate-950">Расходы</h1></div></header><section className="mt-6 rounded-[24px] bg-rose-50 p-5 ring-1 ring-rose-100"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-white text-rose-600 shadow-sm"><ReceiptText className="size-5" /></span><div><p className="text-sm text-rose-800">Всего расходов</p><p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{money}</p><p className="mt-1 text-sm text-slate-600">Добавляйте зарплаты, материалы, платежи и другие расходы отдельно.</p></div></div></section><ExpenseList key={`${expensePage.totalCount}-${expenses.map((expense) => expense.id).join("-")}`} projectId={project.id} initialExpenses={expenses} initialPageInfo={expensePage.pageInfo} totalCount={expensePage.totalCount} canEdit={project.canEdit && project.status === "ACTIVE"} /></div>;
}
