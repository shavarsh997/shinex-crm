import { ReceiptText } from "lucide-react";

import { getAuthenticatedUser } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { formatMoney } from "@/lib/money";
import { getTranslations } from "@/i18n/server";

export default async function ActivityPage() {
  const { locale, t } = await getTranslations();
  const user = await getAuthenticatedUser();
  const expenses = await prisma.expense.findMany({ where: { deletedAt: null, project: { deletedAt: null, OR: [{ userId: user.id }, { members: { some: { userId: user.id, deletedAt: null } } }] } }, include: { project: { select: { title: true } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 30 });
  return <div className="mx-auto max-w-3xl px-5 pb-28 pt-6 sm:px-8 sm:pt-8"><header><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">SHINEX CRM</p><h1 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-950">{t("activity.title")}</h1><p className="mt-1 text-sm text-slate-500">{t("activity.description")}</p></header><section className="mt-6 overflow-hidden rounded-[22px] bg-white ring-1 ring-slate-200/80">{expenses.length === 0 ? <div className="px-6 py-16 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><ReceiptText className="size-6" /></div><p className="mt-4 font-semibold text-slate-900">{t("activity.emptyTitle")}</p><p className="mt-1 text-sm text-slate-500">{t("activity.emptyDescription")}</p></div> : expenses.map((expense) => <article key={expense.id} className="flex items-center gap-3 border-b border-slate-100 p-4 last:border-0"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600"><ReceiptText className="size-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{expense.title}</p><p className="mt-0.5 truncate text-xs text-slate-500">{expense.project.title} · {new Intl.DateTimeFormat(locale === "hy" ? "hy-AM" : "ru-RU", { day: "numeric", month: "short" }).format(expense.date)}</p></div><p className="text-sm font-semibold text-rose-600">−{formatMoney(expense.amount)}</p></article>)}</section></div>;
}
