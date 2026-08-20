import { CreateProjectForm } from "@/components/projects/create-project-form";

export default function NewProjectPage() { return <div className="mx-auto max-w-2xl p-5 sm:p-8"><p className="text-sm text-muted-foreground">Новый проект</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Создайте проект</h1><p className="mt-2 text-sm text-muted-foreground">Добавьте основные данные — детали клиента можно заполнить позже.</p><div className="mt-8 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-7"><CreateProjectForm /></div></div>; }
