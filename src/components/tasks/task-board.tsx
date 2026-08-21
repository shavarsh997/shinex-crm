"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CalendarDays, Check, Circle, CircleDot, ClipboardCheck, Pencil, Plus, Trash2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type TaskView = { id: string; title: string; description: string | null; employeeName: string | null; status: TaskStatus; dueDate: string | null; completedAt: string | null; project: { id: string; title: string } | null; createdBy: { id: string; name: string | null } };
type ProjectOption = { id: string; title: string };

const statusInfo: Record<TaskStatus, { label: string; className: string; icon: typeof Circle }> = {
  TODO: { label: "Новая", className: "bg-slate-100 text-slate-600", icon: Circle },
  IN_PROGRESS: { label: "В работе", className: "bg-blue-50 text-blue-700", icon: CircleDot },
  DONE: { label: "Выполнена", className: "bg-emerald-50 text-emerald-700", icon: Check },
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(date));
}

function TaskForm({ task, projects, onClose }: { task: TaskView | null; projects: ProjectOption[]; onClose: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "TODO");
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(data: FormData) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(task ? `/api/tasks/${task.id}` : "/api/tasks", { method: task ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(data), ...(task ? { status } : {}) }) });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message || "Не удалось сохранить задачу.");
      onClose();
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось сохранить задачу.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!task || !window.confirm("Удалить эту задачу?")) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message || "Не удалось удалить задачу.");
      }
      onClose();
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось удалить задачу.");
    } finally {
      setDeleting(false);
    }
  }

  return <form action={submit} className="mt-5 grid gap-5"><label className="grid gap-2 text-sm font-semibold text-slate-700">Задача<Input required name="title" defaultValue={task?.title} placeholder="Например: согласовать закупку материалов" className="h-12 rounded-2xl border-slate-200 px-4" /></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Описание <span className="font-normal text-slate-400">(необязательно)</span><textarea name="description" defaultValue={task?.description || ""} rows={3} placeholder="Что нужно сделать и какой результат ожидается" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-blue-100" /></label>{task && <div><p className="mb-2 text-sm font-semibold text-slate-700">Статус</p><div className="grid grid-cols-3 gap-2">{(Object.keys(statusInfo) as TaskStatus[]).map((value) => { const item = statusInfo[value]; const Icon = item.icon; return <button key={value} type="button" onClick={() => setStatus(value)} className={`flex min-h-19 flex-col items-center justify-center rounded-2xl border px-2 text-center text-xs font-semibold transition ${status === value ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100" : "border-slate-200 text-slate-600"}`}><Icon className="size-4" /><span className="mt-1">{item.label}</span></button>; })}</div></div>}<label className="grid gap-2 text-sm font-semibold text-slate-700">Проект <span className="font-normal text-slate-400">(необязательно)</span><select name="projectId" defaultValue={task?.project?.id || ""} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:ring-3 focus:ring-blue-100"><option value="">Без привязки к проекту</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Сотрудник <span className="font-normal text-slate-400">(необязательно)</span><div className="relative"><Input name="employeeName" defaultValue={task?.employeeName || ""} placeholder="Кому относится задача" className="h-12 rounded-2xl border-slate-200 pl-11" /><UserRound className="pointer-events-none absolute left-4 top-3.5 size-5 text-slate-400" /></div></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Срок <span className="font-normal text-slate-400">(необязательно)</span><div className="relative"><Input name="dueDate" type="date" defaultValue={task?.dueDate?.slice(0, 10) || ""} className="h-12 rounded-2xl border-slate-200 px-4" /><CalendarDays className="pointer-events-none absolute right-4 top-3.5 size-5 text-slate-400" /></div></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex gap-3">{task && <Button type="button" variant="destructive" size="lg" className="h-12 rounded-2xl" disabled={deleting || pending} onClick={remove}><Trash2 className="size-4" />{deleting ? "Удаляем…" : "Удалить"}</Button>}<Button type="submit" size="lg" className="h-12 flex-1 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20 hover:bg-blue-700" disabled={pending || deleting}>{pending ? "Сохраняем…" : task ? "Сохранить задачу" : "Создать задачу"}</Button></div></form>;
}

export function TaskBoard({ tasks, projects }: { tasks: TaskView[]; projects: ProjectOption[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"active" | "archive">("active");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaskView | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== "DONE"), [tasks]);
  const archivedTasks = useMemo(() => tasks.filter((task) => task.status === "DONE"), [tasks]);
  const visibleTasks = tab === "active" ? activeTasks : archivedTasks;

  function showCreate() {
    setEditing(null);
    setOpen(true);
  }

  function showEdit(task: TaskView) {
    setEditing(task);
    setOpen(true);
  }

  async function setTaskStatus(task: TaskView, status: TaskStatus) {
    setUpdatingId(task.id);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message || "Не удалось изменить статус задачи.");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось изменить статус задачи.");
    } finally {
      setUpdatingId(null);
    }
  }

  return <><section className="mt-6 rounded-[24px] bg-slate-950 p-5 text-white shadow-[0_16px_36px_rgba(15,23,42,0.16)]"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-slate-300">Активные задачи</p><p className="mt-1 text-3xl font-semibold tracking-[-0.06em]">{activeTasks.length}</p><p className="mt-1 text-sm text-slate-400">Выполненные задачи останутся в архиве.</p></div><span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-blue-200"><ClipboardCheck className="size-5" /></span></div></section><section className="mt-6"><div className="flex items-center justify-between gap-3"><div className="inline-flex rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setTab("active")} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === "active" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Активные <span className="ml-1 text-xs text-slate-400">{activeTasks.length}</span></button><button type="button" onClick={() => setTab("archive")} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === "archive" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Архив <span className="ml-1 text-xs text-slate-400">{archivedTasks.length}</span></button></div><Button size="lg" className="h-10 rounded-xl bg-blue-600 px-3 hover:bg-blue-700" onClick={showCreate}><Plus className="size-4" />Добавить</Button></div>{error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<div className="mt-4 grid gap-3">{visibleTasks.length === 0 ? <div className="rounded-[22px] border border-dashed border-slate-200 bg-white px-6 py-14 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">{tab === "active" ? <ClipboardCheck className="size-6" /> : <Archive className="size-6" />}</span><p className="mt-4 font-semibold text-slate-900">{tab === "active" ? "Активных задач нет" : "Архив пока пуст"}</p><p className="mt-1 text-sm text-slate-500">{tab === "active" ? "Добавьте задачу, чтобы не упустить важное." : "Выполненные задачи будут храниться здесь."}</p>{tab === "active" && <Button className="mt-5 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={showCreate}><Plus className="size-4" />Создать задачу</Button>}</div> : visibleTasks.map((task) => { const info = statusInfo[task.status]; const StatusIcon = info.icon; const isUpdating = updatingId === task.id; return <article key={task.id} className="rounded-[22px] bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.035)] ring-1 ring-slate-200/80"><div className="flex items-start gap-3"><button type="button" aria-label={task.status === "DONE" ? "Вернуть задачу в работу" : "Отметить задачу выполненной"} disabled={isUpdating} onClick={() => setTaskStatus(task, task.status === "DONE" ? "IN_PROGRESS" : "DONE")} className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 transition disabled:opacity-50 ${task.status === "DONE" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-500 hover:bg-emerald-50"}`}><Check className="size-4" /></button><div className="min-w-0 flex-1"><button type="button" onClick={() => showEdit(task)} className="block max-w-full text-left"><h2 className={`text-[15px] font-semibold tracking-[-0.015em] ${task.status === "DONE" ? "text-slate-400 line-through" : "text-slate-900"}`}>{task.title}</h2></button>{task.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>}<div className="mt-3 flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${info.className}`}><StatusIcon className="size-3" />{info.label}</span>{task.project && <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">{task.project.title}</span>}{task.employeeName && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700"><UserRound className="size-3" />{task.employeeName}</span>}{task.dueDate && <span className={`inline-flex items-center gap-1 text-xs ${new Date(task.dueDate) < new Date() && task.status !== "DONE" ? "text-rose-600" : "text-slate-400"}`}><CalendarDays className="size-3.5" />{formatDate(task.dueDate)}</span>}</div></div><Button aria-label="Открыть задачу" variant="ghost" size="icon-sm" onClick={() => showEdit(task)}><Pencil className="size-4 text-slate-400" /></Button></div></article>; })}</div></section><Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setEditing(null); }}><DialogContent className="bottom-0 top-auto max-h-[92vh] max-w-none translate-y-0 gap-5 overflow-y-auto rounded-b-none rounded-t-[28px] p-5 pb-8 sm:bottom-1/2 sm:max-w-lg sm:-translate-y-1/2 sm:rounded-[28px] sm:p-7"><DialogHeader><DialogTitle className="text-xl tracking-[-0.035em]">{editing ? "Задача" : "Новая задача"}</DialogTitle><DialogDescription>{editing ? "Измените детали, статус или привязку задачи." : "Задачу можно оставить личной или привязать к проекту и сотруднику."}</DialogDescription></DialogHeader><TaskForm key={editing?.id || "new"} task={editing} projects={projects} onClose={() => { setOpen(false); setEditing(null); }} /></DialogContent></Dialog></>;
}
