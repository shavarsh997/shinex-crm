import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleDollarSign } from "lucide-react";

import { PaymentDialog } from "@/components/payments/payment-dialog";
import { getAuthenticatedUser } from "@/server/auth";
import { getUserProject } from "@/server/modules/projects/projects.service";
import { NotFoundError } from "@/server/shared/errors";

export default async function ProjectPaymentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthenticatedUser();
  const { projectId } = await params;
  let project;
  try {
    project = await getUserProject(user.id, projectId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const money = (amount: bigint) => `${new Intl.NumberFormat("ru-RU").format(amount)} AMD`;
  const canEditProject = project.canEdit && project.status === "ACTIVE";

  return <div className="mx-auto max-w-4xl px-5 pb-28 pt-5 sm:px-8 sm:pt-8"><header className="flex items-center gap-3"><Link href={`/dashboard/projects/${project.id}`} aria-label="Вернуться к проекту" className="grid size-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"><ArrowLeft className="size-5" /></Link><div><p className="text-xs text-slate-400">{project.title}</p><h1 className="text-xl font-semibold tracking-[-0.035em] text-slate-950">Поступления</h1></div></header><section className="mt-6 rounded-[24px] bg-emerald-50 p-5 ring-1 ring-emerald-100"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-white text-emerald-600 shadow-sm"><CircleDollarSign className="size-5" /></span><div><p className="text-sm text-emerald-800">Получено по проекту</p><p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{money(project.receivedAmount)}</p><p className="mt-1 text-sm text-slate-600">Фиксируйте каждое поступление от клиента или работодателя.</p></div></div>{canEditProject && <PaymentDialog projectId={project.id} />}</div></section><section className="mt-8"><div className="flex items-end justify-between"><div><h2 className="text-lg font-semibold">История поступлений</h2><p className="mt-1 text-sm text-slate-500">{project.payments.length} {project.payments.length === 1 ? "запись" : project.payments.length >= 2 && project.payments.length <= 4 ? "записи" : "записей"}</p></div></div><div className="mt-4 overflow-hidden rounded-[22px] bg-white ring-1 ring-slate-200/80">{project.payments.length === 0 ? <div className="px-6 py-14 text-center"><p className="font-semibold text-slate-900">Поступлений пока нет</p><p className="mt-1 text-sm text-slate-500">Добавьте первую оплату, когда деньги поступят на проект.</p></div> : project.payments.map((payment) => <article key={payment.id} className="flex items-center justify-between gap-4 border-b border-slate-100 p-4 last:border-0"><div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{payment.notes || "Поступление по проекту"}</p><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(payment.date)}</p></div><p className="shrink-0 font-semibold text-emerald-600">+{money(payment.amount)}</p></article>)}</div></section></div>;
}
