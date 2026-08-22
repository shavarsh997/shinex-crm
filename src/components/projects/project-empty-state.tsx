"use client";

import Link from "next/link";
import { FolderPlus, Plus } from "lucide-react";
import { useTranslations } from "@/i18n/provider";

export function ProjectEmptyState({ canCreate }: { canCreate: boolean }) { const { t } = useTranslations(); return <section className="flex min-h-72 flex-col items-center justify-center rounded-[24px] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/80"><div className="mb-4 rounded-2xl bg-blue-50 p-3 text-blue-600"><FolderPlus className="size-7" /></div><h2 className="text-lg font-semibold tracking-[-0.025em] text-slate-950">{t("project.emptyTitle")}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{canCreate ? t("project.emptyDescription") : t("project.accessEmptyDescription")}</p>{canCreate && <Link href="/dashboard/projects/new" className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15"><Plus className="size-4" />{t("project.create")}</Link>}</section>; }
