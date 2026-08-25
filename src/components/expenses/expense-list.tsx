"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "@/i18n/provider";
import { confirmationHeaders, requestConfirmationCode } from "@/lib/confirmation";
import { ExpenseDialog } from "./expense-dialog";

export type ExpenseView = { id: string; type: "EMPLOYEE" | "MATERIAL" | "FUEL" | "TRANSPORT" | "EQUIPMENT" | "SERVICE" | "OTHER"; title: string; amount: string; date: string; description: string | null; employeeName: string | null; employeeId: string | null; vendorName: string | null; notes: string | null };
export type EmployeeOption = { id: string; fullName: string; profession: string | null };
type ExpenseTypeFilter = "ALL" | ExpenseView["type"];
type ExpenseSort = "newest" | "oldest" | "highest" | "lowest";
type PageInfo = { hasNextPage: boolean; nextCursor: string | null };

export function ExpenseList({ projectId, initialExpenses, initialPageInfo, totalCount, canEdit, employees }: { projectId: string; initialExpenses: ExpenseView[]; initialPageInfo: PageInfo; totalCount: number; canEdit: boolean; employees: EmployeeOption[] }) {
  const { locale, t } = useTranslations();
  const labels: Record<ExpenseView["type"], string> = { EMPLOYEE: t("expense.employeeType"), MATERIAL: t("expense.material"), FUEL: t("expense.fuel"), TRANSPORT: t("expense.transport"), EQUIPMENT: t("expense.equipment"), SERVICE: t("expense.service"), OTHER: t("expense.other") };
  const router = useRouter();
  const [type, setType] = useState<ExpenseTypeFilter>("ALL");
  const [sort, setSort] = useState<ExpenseSort>("newest");
  const [expenses, setExpenses] = useState(initialExpenses);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [count, setCount] = useState(totalCount);
  const [editing, setEditing] = useState<ExpenseView | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadExpenses(nextType: ExpenseTypeFilter, nextSort: ExpenseSort, cursor?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "10", sort: nextSort });
      if (nextType !== "ALL") params.set("type", nextType);
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/projects/${projectId}/expenses?${params}`);
      const payload = await response.json().catch(() => null) as { expenses?: ExpenseView[]; pageInfo?: PageInfo; totalCount?: number; error?: { message?: string } } | null;
      if (!response.ok || !payload?.expenses || !payload.pageInfo || payload.totalCount === undefined) throw new Error(payload?.error?.message || t("expense.loadFailed"));
      setExpenses((current) => cursor ? [...current, ...payload.expenses!] : payload.expenses!);
      setPageInfo(payload.pageInfo);
      setCount(payload.totalCount);
    } catch (error) {
      alert(error instanceof Error ? error.message : t("expense.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  function changeType(nextType: ExpenseTypeFilter) {
    setType(nextType);
    void loadExpenses(nextType, sort);
  }

  function changeSort(nextSort: ExpenseSort) {
    setSort(nextSort);
    void loadExpenses(type, nextSort);
  }

  async function remove(expenseId: string) {
    if (!window.confirm(t("expense.deleteConfirm"))) return;
    setDeleting(expenseId);
    try {
      const code = await requestConfirmationCode("expense-delete", expenseId, (phrase) => t("confirmation.prompt", { phrase }));
      if (!code) return;
      const response = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE", headers: confirmationHeaders(code) });
      if (!response.ok) throw new Error(t("expense.deleteFailed"));
      router.refresh();
    } catch (caughtError) {
      alert(caughtError instanceof Error ? caughtError.message : t("expense.deleteFailed"));
    } finally {
      setDeleting(null);
    }
  }

  return <section className="mt-8"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-semibold">{t("expense.title")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("common.countRecords", { count })}</p></div>{canEdit && <ExpenseDialog projectId={projectId} employees={employees} />}</div><div className="mt-5 flex flex-wrap gap-2"><select aria-label={t("expense.type")} value={type} disabled={loading} onChange={(event) => changeType(event.target.value as ExpenseTypeFilter)} className="h-9 rounded-lg border bg-card px-2 text-sm disabled:opacity-60"><option value="ALL">{t("expense.all")}</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label={t("expense.sort")} value={sort} disabled={loading} onChange={(event) => changeSort(event.target.value as ExpenseSort)} className="h-9 rounded-lg border bg-card px-2 text-sm disabled:opacity-60"><option value="newest">{t("expense.newest")}</option><option value="oldest">{t("expense.oldest")}</option><option value="highest">{t("expense.highest")}</option><option value="lowest">{t("expense.lowest")}</option></select></div><div className="mt-4 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">{expenses.length === 0 ? <p className="p-7 text-center text-sm text-muted-foreground">{t("expense.empty")}</p> : expenses.map((expense) => <article key={expense.id} className="flex items-center gap-3 border-b p-4 last:border-0"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><h3 className="font-medium">{expense.title}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{labels[expense.type]}</span></div><p className="mt-1 text-sm text-muted-foreground">{expense.employeeName || expense.vendorName || expense.description || new Intl.DateTimeFormat(locale === "hy" ? "hy-AM" : "ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(expense.date))}</p></div><div className="text-right"><p className="font-semibold">{formatMoney(expense.amount)}</p>{canEdit && <div className="mt-1 flex justify-end"><Button aria-label={t("common.edit")} variant="ghost" size="icon-sm" onClick={() => setEditing(expense)}><Pencil /></Button><Button aria-label={t("common.delete")} variant="ghost" size="icon-sm" disabled={deleting === expense.id} onClick={() => remove(expense.id)}><Trash2 className="text-destructive" /></Button></div>}</div></article>)}</div>{pageInfo.hasNextPage && <div className="mt-4 flex justify-center"><Button variant="outline" className="min-w-40 rounded-xl" disabled={loading} onClick={() => void loadExpenses(type, sort, pageInfo.nextCursor || undefined)}>{loading ? t("common.loading") : t("common.showMore")}</Button></div>}{editing && <ExpenseDialog projectId={projectId} employees={employees} expense={editing} open onOpenChange={(open) => !open && setEditing(null)} />}</section>;
}
