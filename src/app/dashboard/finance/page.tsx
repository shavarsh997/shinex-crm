import { ArrowDownRight, ArrowUpRight, BarChart3, WalletCards } from "lucide-react";

import { getAuthenticatedUser } from "@/server/auth";
import { getUserProjects } from "@/server/modules/projects/projects.service";
import { getTranslations } from "@/i18n/server";

export default async function FinancePage() {
  const { locale, t } = await getTranslations();
  const user = await getAuthenticatedUser();
  const projects = await getUserProjects(user.id, "ACTIVE");
  const budget = projects.reduce((sum, project) => sum + project.estimatedAmount, 0n);
  const received = projects.reduce((sum, project) => sum + project.receivedAmount, 0n);
  const spent = projects.reduce((sum, project) => sum + project.spentAmount, 0n);
  const remaining = budget - spent;
  const ratio = budget > 0n ? Math.min(100, Number((spent * 100n) / budget)) : 0;
  const compact = (amount: bigint) => `${new Intl.NumberFormat(locale === "hy" ? "hy-AM" : "ru-RU", { notation: "compact", maximumFractionDigits: 1 }).format(amount)} AMD`;

  return <div className="mx-auto max-w-4xl px-5 pb-28 pt-6 sm:px-8 sm:pt-8"><header><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">SHINEX CRM</p><h1 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-950">{t("finance.title")}</h1><p className="mt-1 text-sm text-slate-500">{t("finance.description")}</p></header><section className="mt-6 rounded-[24px] bg-slate-950 p-5 text-white shadow-[0_16px_36px_rgba(15,23,42,0.16)]"><div className="flex items-center justify-between"><p className="text-sm text-slate-300">{t("finance.freeBudget")}</p><WalletCards className="size-5 text-blue-300" /></div><p className="mt-2 text-3xl font-semibold tracking-[-0.06em]">{compact(remaining)}</p><div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-blue-400" style={{ width: `${ratio}%` }} /></div><p className="mt-2 text-xs text-slate-300">{t("finance.used", { ratio })}</p></section><section className="mt-4 grid grid-cols-2 gap-3"><article className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80"><span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ArrowDownRight className="size-4" /></span><p className="mt-4 text-xs text-slate-400">{t("finance.received")}</p><p className="mt-1 font-semibold text-slate-900">{compact(received)}</p></article><article className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80"><span className="grid size-8 place-items-center rounded-xl bg-rose-50 text-rose-600"><ArrowUpRight className="size-4" /></span><p className="mt-4 text-xs text-slate-400">{t("finance.spent")}</p><p className="mt-1 font-semibold text-slate-900">{compact(spent)}</p></article></section><section className="mt-6 rounded-[22px] bg-white p-5 ring-1 ring-slate-200/80"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600"><BarChart3 className="size-5" /></span><div><h2 className="font-semibold text-slate-950">{t("finance.budgetAndExpenses")}</h2><p className="text-xs text-slate-500">{t("finance.updated")}</p></div></div><div className="mt-7 flex h-32 items-end gap-3 border-b border-slate-100 px-2 pb-1">{[42, 56, 38, 71, 64, 82, ratio].map((height, index) => <div key={index} className="flex flex-1 flex-col justify-end gap-2"><div className="rounded-t-md bg-gradient-to-t from-blue-600 to-indigo-400" style={{ height: `${Math.max(10, height)}%` }} /><span className="text-center text-[9px] text-slate-400">{index + 1}</span></div>)}</div></section></div>;
}
