"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { ExpenseDialog } from "./expense-dialog";

export type ExpenseView = { id: string; type: "EMPLOYEE" | "MATERIAL" | "FUEL" | "TRANSPORT" | "EQUIPMENT" | "SERVICE" | "OTHER"; title: string; amount: string; date: string; description: string | null; employeeName: string | null; vendorName: string | null; notes: string | null };
type ExpenseTypeFilter = "ALL" | ExpenseView["type"];
type ExpenseSort = "newest" | "oldest" | "highest" | "lowest";
type PageInfo = { hasNextPage: boolean; nextCursor: string | null };

const labels: Record<ExpenseView["type"], string> = { EMPLOYEE: "Зарплата", MATERIAL: "Материалы", FUEL: "Топливо", TRANSPORT: "Транспорт", EQUIPMENT: "Оборудование", SERVICE: "Услуги", OTHER: "Другое" };

export function ExpenseList({ projectId, initialExpenses, initialPageInfo, totalCount, canEdit }: { projectId: string; initialExpenses: ExpenseView[]; initialPageInfo: PageInfo; totalCount: number; canEdit: boolean }) {
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
      if (!response.ok || !payload?.expenses || !payload.pageInfo || payload.totalCount === undefined) throw new Error(payload?.error?.message || "Не удалось загрузить расходы.");
      setExpenses((current) => cursor ? [...current, ...payload.expenses!] : payload.expenses!);
      setPageInfo(payload.pageInfo);
      setCount(payload.totalCount);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Не удалось загрузить расходы.");
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
    if (!window.confirm("Удалить этот расход?")) return;
    setDeleting(expenseId);
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Не удалось удалить расход.");
      router.refresh();
    } catch (caughtError) {
      alert(caughtError instanceof Error ? caughtError.message : "Не удалось удалить расход.");
    } finally {
      setDeleting(null);
    }
  }

  return <section className="mt-8"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-semibold">Расходы</h2><p className="mt-1 text-sm text-muted-foreground">{count} записей</p></div>{canEdit && <ExpenseDialog projectId={projectId} />}</div><div className="mt-5 flex flex-wrap gap-2"><select aria-label="Тип расхода" value={type} disabled={loading} onChange={(event) => changeType(event.target.value as ExpenseTypeFilter)} className="h-9 rounded-lg border bg-card px-2 text-sm disabled:opacity-60"><option value="ALL">Все расходы</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Сортировка" value={sort} disabled={loading} onChange={(event) => changeSort(event.target.value as ExpenseSort)} className="h-9 rounded-lg border bg-card px-2 text-sm disabled:opacity-60"><option value="newest">Сначала новые</option><option value="oldest">Сначала старые</option><option value="highest">Сначала дорогие</option><option value="lowest">Сначала дешёвые</option></select></div><div className="mt-4 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">{expenses.length === 0 ? <p className="p-7 text-center text-sm text-muted-foreground">Расходов с такими фильтрами нет.</p> : expenses.map((expense) => <article key={expense.id} className="flex items-center gap-3 border-b p-4 last:border-0"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><h3 className="font-medium">{expense.title}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{labels[expense.type]}</span></div><p className="mt-1 text-sm text-muted-foreground">{expense.employeeName || expense.vendorName || expense.description || new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(expense.date))}</p></div><div className="text-right"><p className="font-semibold">{formatMoney(expense.amount)}</p>{canEdit && <div className="mt-1 flex justify-end"><Button aria-label="Редактировать" variant="ghost" size="icon-sm" onClick={() => setEditing(expense)}><Pencil /></Button><Button aria-label="Удалить" variant="ghost" size="icon-sm" disabled={deleting === expense.id} onClick={() => remove(expense.id)}><Trash2 className="text-destructive" /></Button></div>}</div></article>)}</div>{pageInfo.hasNextPage && <div className="mt-4 flex justify-center"><Button variant="outline" className="min-w-40 rounded-xl" disabled={loading} onClick={() => void loadExpenses(type, sort, pageInfo.nextCursor || undefined)}>{loading ? "Загружаем…" : "Показать ещё"}</Button></div>}{editing && <ExpenseDialog projectId={projectId} expense={editing} open onOpenChange={(open) => !open && setEditing(null)} />}</section>;
}
