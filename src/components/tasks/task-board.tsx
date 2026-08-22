"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, Circle, CircleDot, ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, ResponsiveDialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/i18n/provider";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type TaskTab = "active" | "archive";
type TaskView = { id: string; title: string; description: string | null; status: TaskStatus; project: { id: string; title: string } | null };
type ProjectOption = { id: string; title: string };
type PageInfo = { hasNextPage: boolean; nextCursor: string | null };

function TaskForm({ task, projects, onClose }: { task: TaskView | null; projects: ProjectOption[]; onClose: () => void }) {
  const { t } = useTranslations();
  const router = useRouter();
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "TODO");
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(data: FormData) {
    setPending(true); setError(null);
    try {
      const response = await fetch(task ? `/api/tasks/${task.id}` : "/api/tasks", { method: task ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(data), ...(task ? { status } : {}) }) });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message || t("tasks.saveFailed"));
      onClose(); router.refresh();
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : t("tasks.saveFailed")); } finally { setPending(false); }
  }

  async function remove() {
    if (!task || !window.confirm(t("tasks.deleteConfirm"))) return;
    setDeleting(true); setError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!response.ok) { const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null; throw new Error(payload?.error?.message || t("tasks.deleteFailed")); }
      onClose(); router.refresh();
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : t("tasks.deleteFailed")); } finally { setDeleting(false); }
  }

  const statusInfo: Record<TaskStatus, { label: string; className: string; icon: typeof Circle }> = { TODO: { label: t("tasks.todo"), className: "bg-slate-100 text-slate-600", icon: Circle }, IN_PROGRESS: { label: t("tasks.inProgress"), className: "bg-blue-50 text-blue-700", icon: CircleDot }, DONE: { label: t("tasks.done"), className: "bg-emerald-50 text-emerald-700", icon: Check } };
  return <form action={submit} className="mt-5 grid gap-5"><label className="grid gap-2 text-sm font-semibold text-slate-700">{t("tasks.titleField")}<Input required name="title" defaultValue={task?.title} placeholder="…" className="h-12 rounded-2xl border-slate-200 px-4" /></label><label className="grid gap-2 text-sm font-semibold text-slate-700">{t("form.description")} <span className="font-normal text-slate-400">({t("common.optional")})</span><textarea name="description" defaultValue={task?.description || ""} rows={3} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-blue-100" /></label>{task && <div><p className="mb-2 text-sm font-semibold text-slate-700">{t("tasks.status")}</p><div className="grid grid-cols-3 gap-2">{(Object.keys(statusInfo) as TaskStatus[]).map((value) => { const item = statusInfo[value]; const Icon = item.icon; return <button key={value} type="button" onClick={() => setStatus(value)} className={`flex min-h-19 flex-col items-center justify-center rounded-2xl border px-2 text-center text-xs font-semibold transition ${status === value ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100" : "border-slate-200 text-slate-600"}`}><Icon className="size-4" /><span className="mt-1">{item.label}</span></button>; })}</div></div>}<label className="grid gap-2 text-sm font-semibold text-slate-700">{t("tasks.project")} <span className="font-normal text-slate-400">({t("common.optional")})</span><select name="projectId" defaultValue={task?.project?.id || ""} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:ring-3 focus:ring-blue-100"><option value="">{t("tasks.noProject")}</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex gap-3">{task && <Button type="button" variant="destructive" size="lg" className="h-12 rounded-2xl" disabled={deleting || pending} onClick={remove}><Trash2 className="size-4" />{deleting ? t("common.deleting") : t("common.delete")}</Button>}<Button type="submit" size="lg" className="h-12 flex-1 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20 hover:bg-blue-700" disabled={pending || deleting}>{pending ? t("common.saving") : task ? t("tasks.save") : t("tasks.create")}</Button></div></form>;
}

export function TaskBoard({ initialActiveTasks, activeCount, archiveCount, initialActivePageInfo, projects }: { initialActiveTasks: TaskView[]; activeCount: number; archiveCount: number; initialActivePageInfo: PageInfo; projects: ProjectOption[] }) {
  const { t } = useTranslations();
  const statusInfo: Record<TaskStatus, { label: string; className: string; icon: typeof Circle }> = { TODO: { label: t("tasks.todo"), className: "bg-slate-100 text-slate-600", icon: Circle }, IN_PROGRESS: { label: t("tasks.inProgress"), className: "bg-blue-50 text-blue-700", icon: CircleDot }, DONE: { label: t("tasks.done"), className: "bg-emerald-50 text-emerald-700", icon: Check } };
  const router = useRouter();
  const [tab, setTab] = useState<TaskTab>("active");
  const [taskLists, setTaskLists] = useState<Record<TaskTab, TaskView[]>>({ active: initialActiveTasks, archive: [] });
  const [pageInfo, setPageInfo] = useState<Record<TaskTab, PageInfo | null>>({ active: initialActivePageInfo, archive: null });
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<TaskView | null>(null); const [updatingId, setUpdatingId] = useState<string | null>(null); const [loadingTab, setLoadingTab] = useState<TaskTab | null>(null); const [error, setError] = useState<string | null>(null);
  const visibleTasks = taskLists[tab]; const visiblePageInfo = pageInfo[tab];
  function openTask(task: TaskView | null) { setEditing(task); setOpen(true); }

  async function loadTasks(nextTab: TaskTab, cursor?: string) {
    setLoadingTab(nextTab); setError(null);
    try {
      const params = new URLSearchParams({ tab: nextTab, limit: "10" }); if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/tasks?${params}`);
      const payload = await response.json().catch(() => null) as { tasks?: TaskView[]; pageInfo?: PageInfo; error?: { message?: string } } | null;
      if (!response.ok || !payload?.tasks || !payload.pageInfo) throw new Error(payload?.error?.message || t("tasks.loadFailed"));
      setTaskLists((current) => ({ ...current, [nextTab]: cursor ? [...current[nextTab], ...payload.tasks!] : payload.tasks! })); setPageInfo((current) => ({ ...current, [nextTab]: payload.pageInfo! }));
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : t("tasks.loadFailed")); } finally { setLoadingTab(null); }
  }

  function selectTab(nextTab: TaskTab) { setTab(nextTab); if (pageInfo[nextTab] === null && (nextTab === "active" ? activeCount : archiveCount) > 0) void loadTasks(nextTab); }
  async function setTaskStatus(task: TaskView, status: TaskStatus) { setUpdatingId(task.id); setError(null); try { const response = await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null; if (!response.ok) throw new Error(payload?.error?.message || t("tasks.statusFailed")); router.refresh(); } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : t("tasks.statusFailed")); } finally { setUpdatingId(null); } }

  return <><section className="mt-6 rounded-[24px] bg-slate-950 p-5 text-white shadow-[0_16px_36px_rgba(15,23,42,0.16)]"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-slate-300">Активные задачи</p><p className="mt-1 text-3xl font-semibold tracking-[-0.06em]">{activeCount}</p><p className="mt-1 text-sm text-slate-400">Выполненные задачи останутся в архиве.</p></div><span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-blue-200"><ClipboardCheck className="size-5" /></span></div></section><section className="mt-6"><div className="flex items-center justify-between gap-3"><div className="inline-flex rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => selectTab("active")} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === "active" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Активные <span className="ml-1 text-xs text-slate-400">{activeCount}</span></button><button type="button" onClick={() => selectTab("archive")} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === "archive" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Архив <span className="ml-1 text-xs text-slate-400">{archiveCount}</span></button></div><Button size="lg" className="h-10 rounded-xl bg-blue-600 px-3 hover:bg-blue-700" onClick={() => openTask(null)}><Plus className="size-4" />Добавить</Button></div>{error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<div className="mt-4 grid gap-3">{visibleTasks.length === 0 && loadingTab === tab ? <p className="py-8 text-center text-sm text-slate-500">Загружаем задачи…</p> : visibleTasks.length === 0 ? <div className="rounded-[22px] border border-dashed border-slate-200 bg-white px-6 py-14 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">{tab === "active" ? <ClipboardCheck className="size-6" /> : <Archive className="size-6" />}</span><p className="mt-4 font-semibold text-slate-900">{tab === "active" ? "Активных задач нет" : "Архив пока пуст"}</p><p className="mt-1 text-sm text-slate-500">{tab === "active" ? "Добавьте задачу, чтобы не упустить важное." : "Выполненные задачи будут храниться здесь."}</p>{tab === "active" && <Button className="mt-5 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => openTask(null)}><Plus className="size-4" />Создать задачу</Button>}</div> : visibleTasks.map((task) => { const info = statusInfo[task.status]; const StatusIcon = info.icon; return <article key={task.id} className="rounded-[22px] bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.035)] ring-1 ring-slate-200/80"><div className="flex items-start gap-3"><button type="button" aria-label={task.status === "DONE" ? "Вернуть задачу в работу" : "Отметить задачу выполненной"} disabled={updatingId === task.id} onClick={() => setTaskStatus(task, task.status === "DONE" ? "IN_PROGRESS" : "DONE")} className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 transition disabled:opacity-50 ${task.status === "DONE" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-500 hover:bg-emerald-50"}`}><Check className="size-4" /></button><div className="min-w-0 flex-1"><button type="button" onClick={() => openTask(task)} className="block max-w-full text-left"><h2 className={`text-[15px] font-semibold tracking-[-0.015em] ${task.status === "DONE" ? "text-slate-400 line-through" : "text-slate-900"}`}>{task.title}</h2></button>{task.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>}<div className="mt-3 flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${info.className}`}><StatusIcon className="size-3" />{info.label}</span>{task.project && <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">{task.project.title}</span>}</div></div><Button aria-label="Открыть задачу" variant="ghost" size="icon-sm" onClick={() => openTask(task)}><Pencil className="size-4 text-slate-400" /></Button></div></article>; })}</div>{visiblePageInfo?.hasNextPage && <div className="mt-4 flex justify-center"><Button variant="outline" className="min-w-40 rounded-xl" disabled={loadingTab === tab} onClick={() => void loadTasks(tab, visiblePageInfo.nextCursor || undefined)}>{loadingTab === tab ? "Загружаем…" : "Показать ещё"}</Button></div>}</section><Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setEditing(null); }}><ResponsiveDialogContent className="gap-5 p-5 pb-8 sm:p-7"><DialogHeader><DialogTitle className="text-xl tracking-[-0.035em]">{editing ? "Задача" : "Новая задача"}</DialogTitle><DialogDescription>{editing ? "Измените название, описание, проект или статус задачи." : "Укажите название, описание и при необходимости привяжите задачу к проекту."}</DialogDescription></DialogHeader><TaskForm key={editing?.id || "new"} task={editing} projects={projects} onClose={() => { setOpen(false); setEditing(null); }} /></ResponsiveDialogContent></Dialog></>;
}
