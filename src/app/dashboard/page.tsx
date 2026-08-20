import Link from "next/link";
import { Plus } from "lucide-react";

import { ProjectCard } from "@/components/projects/project-card";
import { ProjectEmptyState } from "@/components/projects/project-empty-state";
import { buttonVariants } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/server/auth";
import { getUserProjects } from "@/server/modules/projects/projects.service";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  const projects = await getUserProjects(user.id);
  return <div className="mx-auto max-w-6xl p-5 sm:p-8">{user.approvalNote && <aside className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><p className="font-medium">Информация от администратора</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{user.approvalNote}</p></aside>}<header className="mb-7 flex items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">Ваши проекты</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h1></div>{projects.length > 0 && <Link href="/dashboard/projects/new" className={buttonVariants({ size: "lg" })}><Plus />Новый проект</Link>}</header>{projects.length === 0 ? <ProjectEmptyState /> : <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</section>}</div>;
}
