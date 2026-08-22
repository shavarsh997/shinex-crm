import { ClipboardCheck } from "lucide-react";

import { TaskBoard } from "@/components/tasks/task-board";
import { getAuthenticatedUser } from "@/server/auth";
import { getEditableProjectsForTasks, getUserTaskCounts, getUserTaskPage } from "@/server/modules/tasks/tasks.service";
import { getTranslations } from "@/i18n/server";

export default async function TasksPage() {
  const { t } = await getTranslations();
  const user = await getAuthenticatedUser();
  const [activeTasks, taskCounts, projects] = await Promise.all([
    getUserTaskPage(user.id, "active", { limit: 10 }),
    getUserTaskCounts(user.id),
    getEditableProjectsForTasks(user.id),
  ]);
  const taskViews = activeTasks.data.map((task) => ({ id: task.id, title: task.title, description: task.description, status: task.status, project: task.project }));

  return <div className="mx-auto max-w-3xl px-5 pb-28 pt-6 sm:px-8 sm:pt-8"><header className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">SHINEX CRM</p><h1 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-950">{t("tasks.title")}</h1><p className="mt-1 text-sm text-slate-500">{t("tasks.description")}</p></div><span className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><ClipboardCheck className="size-5" /></span></header><TaskBoard key={`${taskCounts.active}-${taskCounts.archive}-${taskViews.map((task) => task.id).join("-")}`} initialActiveTasks={taskViews} activeCount={taskCounts.active} archiveCount={taskCounts.archive} initialActivePageInfo={activeTasks.pageInfo} projects={projects} /></div>;
}
