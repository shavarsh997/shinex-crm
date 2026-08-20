import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";

import { ExpenseList, type ExpenseView } from "@/components/expenses/expense-list";
import { ProjectFinanceSummary } from "@/components/projects/project-finance-summary";
import { getAuthenticatedUser } from "@/server/auth";
import { getUserProject } from "@/server/modules/projects/projects.service";
import { NotFoundError } from "@/server/shared/errors";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthenticatedUser();
  const { projectId } = await params;
  let project;
  try {
    project = await getUserProject(user.id, projectId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const expenses: ExpenseView[] = project.expenses.map((expense) => ({ id: expense.id, type: expense.type, title: expense.title, amount: expense.amount.toString(), date: expense.date.toISOString(), description: expense.description, employeeName: expense.employeeName, vendorName: expense.vendorName, notes: expense.notes }));
  return <div className="mx-auto max-w-6xl p-5 sm:p-8"><Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Все проекты</Link><header className="mt-5"><h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>{project.description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{project.description}</p>}{(project.ownerName || project.ownerPhone || project.ownerEmail) && <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm"><UserRound className="mt-0.5 size-4 text-muted-foreground" /><div><p className="font-medium">{project.ownerName || "Клиент"}</p><p className="text-muted-foreground">{[project.ownerPhone, project.ownerEmail].filter(Boolean).join(" · ")}</p>{project.ownerNotes && <p className="mt-1 text-muted-foreground">{project.ownerNotes}</p>}</div></div>}</header><div className="mt-7"><ProjectFinanceSummary estimatedAmount={project.estimatedAmount} receivedAmount={project.receivedAmount} spentAmount={project.spentAmount} /></div><ExpenseList projectId={project.id} expenses={expenses} /></div>;
}
