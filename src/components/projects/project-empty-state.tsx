import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function ProjectEmptyState() { return <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed bg-card p-8 text-center"><div className="mb-4 rounded-xl bg-primary/10 p-3 text-primary"><FolderPlus className="size-6" /></div><h2 className="text-lg font-semibold">Проектов пока нет</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">Создайте первый проект, чтобы начать вести расходы и бюджет.</p><Link href="/dashboard/projects/new" className={`${buttonVariants({ size: "lg" })} mt-5`}>Создать проект</Link></section>; }
