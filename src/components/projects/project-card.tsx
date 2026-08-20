import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/server/generated/prisma/client";
import { formatMoney } from "@/lib/money";

export function ProjectCard({ project }: { project: Project }) {
  const remaining = project.receivedAmount - project.spentAmount;
  return <Link href={`/dashboard/projects/${project.id}`} className="group rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex justify-between gap-3"><div><h2 className="font-semibold">{project.title}</h2>{project.ownerName && <p className="mt-1 text-sm text-muted-foreground">{project.ownerName}</p>}</div><ArrowUpRight className="size-5 text-muted-foreground transition group-hover:text-foreground" /></div><dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 text-sm"><div><dt className="text-muted-foreground">Смета</dt><dd className="mt-1 font-medium">{formatMoney(project.estimatedAmount)}</dd></div><div><dt className="text-muted-foreground">Получено</dt><dd className="mt-1 font-medium">{formatMoney(project.receivedAmount)}</dd></div><div><dt className="text-muted-foreground">Потрачено</dt><dd className="mt-1 font-medium">{formatMoney(project.spentAmount)}</dd></div><div><dt className="text-muted-foreground">Остаток</dt><dd className="mt-1 font-medium">{formatMoney(remaining)}</dd></div></dl></Link>;
}
