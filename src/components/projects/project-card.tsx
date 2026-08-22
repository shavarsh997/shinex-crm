"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleCheck, PauseCircle } from "lucide-react";
import type { Project } from "@/server/generated/prisma/client";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "@/i18n/provider";

export function ProjectCard({ project }: { project: Project }) {
  const { t } = useTranslations();
  const remaining = project.estimatedAmount - project.spentAmount;
  const progress = project.estimatedAmount > 0n ? Math.min(100, Number((project.spentAmount * 100n) / project.estimatedAmount)) : 0;
  const isCompleted = project.status === "COMPLETED";
  const isFrozen = project.status === "FROZEN";
  const label = isCompleted ? t("project.completed") : isFrozen ? t("project.frozen") : t("project.active");
  return <Link href={`/dashboard/projects/${project.id}`} className="group rounded-[20px] bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.035)] ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="mb-2 flex items-center gap-1.5"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${isCompleted ? "bg-slate-100 text-slate-600" : isFrozen ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{isCompleted ? <CheckCircle2 className="size-3" /> : isFrozen ? <PauseCircle className="size-3" /> : <CircleCheck className="size-3" />}{label}</span></div><h2 className="truncate text-[15px] font-semibold tracking-[-0.02em] text-slate-950">{project.title}</h2><p className="mt-1 truncate text-xs text-slate-500">{project.ownerName || t("project.clientMissing")}</p></div><span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-blue-50 group-hover:text-blue-600"><ArrowUpRight className="size-4" /></span></div><dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-slate-100 py-4 text-xs"><div><dt className="text-slate-400">{t("project.budget")}</dt><dd className="mt-1 font-semibold text-slate-800">{formatMoney(project.estimatedAmount)}</dd></div><div><dt className="text-slate-400">{t("project.received")}</dt><dd className="mt-1 font-semibold text-slate-800">{formatMoney(project.receivedAmount)}</dd></div><div><dt className="text-slate-400">{t("project.spent")}</dt><dd className="mt-1 font-semibold text-slate-800">{formatMoney(project.spentAmount)}</dd></div><div><dt className="text-slate-400">{t("project.remaining")}</dt><dd className="mt-1 font-semibold text-slate-800">{formatMoney(remaining)}</dd></div></dl><div className="mt-4"><div className="mb-2 flex justify-between text-[11px]"><span className="font-medium text-slate-500">{t("project.budgetExpenses")}</span><span className="font-semibold text-slate-700">{progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" style={{ width: `${progress}%` }} /></div></div></Link>;
}
