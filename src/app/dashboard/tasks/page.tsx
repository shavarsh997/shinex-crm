import { ClipboardCheck } from "lucide-react";

import { TaskBoard } from "@/components/tasks/task-board";
import { getAuthenticatedUser } from "@/server/auth";
import { getEditableProjectsForTasks, getUserTasks } from "@/server/modules/tasks/tasks.service";

export default async function TasksPage() {
  const user = await getAuthenticatedUser();
  const [tasks, projects] = await Promise.all([getUserTasks(user.id), getEditableProjectsForTasks(user.id)]);
  const taskViews = tasks.map((task) => ({ id: task.id, title: task.title, description: task.description, employeeName: task.employeeName, status: task.status, dueDate: task.dueDate?.toISOString() || null, completedAt: task.completedAt?.toISOString() || null, project: task.project, createdBy: task.createdBy }));

  return <div className="mx-auto max-w-3xl px-5 pb-28 pt-6 sm:px-8 sm:pt-8"><header className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">SHINEX CRM</p><h1 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-950">Задачи</h1><p className="mt-1 text-sm text-slate-500">Планируйте работу по проектам и не теряйте важные дела.</p></div><span className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><ClipboardCheck className="size-5" /></span></header><TaskBoard tasks={taskViews} projects={projects} /></div>;
}
