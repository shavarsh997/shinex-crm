import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CheckCircle2, PauseCircle } from "lucide-react";

import { ProjectMembers } from "@/components/projects/project-members";
import { ProjectEditDialog } from "@/components/projects/project-edit-dialog";
import { ProjectSettingsDialog } from "@/components/projects/project-settings-dialog";
import { getAuthenticatedUser } from "@/server/auth";
import { getUserProject } from "@/server/modules/projects/projects.service";
import { getApprovedUsersForProjectAccess } from "@/server/modules/users/users.service";
import { NotFoundError } from "@/server/shared/errors";
import { getTranslations } from "@/i18n/server";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { locale, t } = await getTranslations();
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
  const spentRatio = project.estimatedAmount > 0n ? Math.min(100, Number((project.spentAmount * 100n) / project.estimatedAmount)) : 0;
  const money = (amount: bigint) => `${new Intl.NumberFormat(locale === "hy" ? "hy-AM" : "ru-RU").format(amount)} AMD`;
  const statusLabel = project.status === "COMPLETED" ? t("project.completed") : project.status === "FROZEN" ? t("project.frozen") : null;
  const cards = [
    { href: "expenses", label: t("project.expenses"), value: project.spentAmount, detail: t("project.operations", { count: project.expenses.length }), accent: "group-hover:bg-rose-50 group-hover:text-rose-600" },
    { href: "payments", label: t("project.payments"), value: project.receivedAmount, detail: t("project.paymentCount", { count: project.payments.length }), accent: "group-hover:bg-emerald-50 group-hover:text-emerald-600" },
    { href: "budget", label: t("project.freeBudget"), value: remaining, detail: t("project.estimateRemaining"), accent: "group-hover:bg-blue-50 group-hover:text-blue-600" },
  ];
  const availableUsers = project.canManageMembers ? await getApprovedUsersForProjectAccess(user.id) : [];

  return <div className="mx-auto max-w-4xl px-5 pb-28 pt-5 sm:px-8 sm:pt-8">
    <header className="flex items-center justify-between"><Link href="/dashboard" aria-label={t("project.all")} className="grid size-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"><ArrowLeft className="size-5" /></Link><div className="flex items-center gap-2">{project.canEdit && project.status === "ACTIVE" && <ProjectEditDialog project={{ id: project.id, title: project.title, description: project.description, ownerName: project.ownerName, ownerPhone: project.ownerPhone, ownerEmail: project.ownerEmail, ownerNotes: project.ownerNotes }} />}{project.canManageMembers && <ProjectSettingsDialog projectId={project.id} status={project.status} completedAt={project.completedAt?.toISOString() ?? null} frozenAt={project.frozenAt?.toISOString() ?? null} />}</div></header>
    <div className="mt-5"><div className="flex flex-wrap items-center gap-2"><p className="text-xs text-slate-400">{t("project.detail")}</p>{statusLabel && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${project.status === "COMPLETED" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700"}`}>{project.status === "COMPLETED" ? <CheckCircle2 className="size-3" /> : <PauseCircle className="size-3" />}{statusLabel}</span>}</div><h1 className="mt-3 text-[28px] font-semibold tracking-[-0.05em] text-slate-950">{project.title}</h1><p className="mt-1 text-sm text-slate-500">{project.description || project.ownerName || t("project.details")}</p></div>
    <section className="mt-6 overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-[0_16px_36px_rgba(15,23,42,0.22)]"><p className="text-sm font-medium text-blue-100">{t("project.projectBudget")}</p><p className="mt-2 text-3xl font-semibold tracking-[-0.06em]">{money(project.estimatedAmount)}</p><div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-4"><div><p className="text-[10px] text-slate-400">{t("project.received")}</p><p className="mt-1 text-xs font-semibold leading-5">{money(project.receivedAmount)}</p></div><div><p className="text-[10px] text-slate-400">{t("project.spent")}</p><p className="mt-1 text-xs font-semibold leading-5">{money(project.spentAmount)}</p></div><div><p className="text-[10px] text-slate-400">{t("project.remaining")}</p><p className="mt-1 text-xs font-semibold leading-5">{money(remaining)}</p></div></div><div className="mt-5"><div className="mb-2 flex justify-between text-[11px] text-slate-300"><span>{t("project.budgetUsed")}</span><span className="font-semibold text-white">{spentRatio}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-blue-400" style={{ width: `${spentRatio}%` }} /></div></div></section>
    <section className="mt-7"><div className="mb-3"><h2 className="text-base font-semibold tracking-[-0.02em] text-slate-950">{t("project.finances")}</h2><p className="mt-1 text-sm text-slate-500">{t("project.financesDescription")}</p></div><div className="grid gap-3 sm:grid-cols-3">{cards.map((card) => <Link key={card.href} href={`/dashboard/projects/${project.id}/${card.href}`} className="group rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-300"><div className="flex items-start justify-between gap-3"><p className="text-xs text-slate-400">{card.label}</p><span className={`grid size-7 place-items-center rounded-full bg-slate-50 text-slate-400 transition ${card.accent}`}><ArrowUpRight className="size-4" /></span></div><p className="mt-1 font-semibold text-slate-900">{money(card.value)}</p><p className="mt-1 text-xs text-slate-500">{card.detail}</p></Link>)}</div></section>
    <ProjectMembers projectId={project.id} owner={project.user} members={project.members} availableUsers={availableUsers} canManage={project.canManageMembers} />
  </div>;
}
