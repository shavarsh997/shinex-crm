"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FolderKanban, Plus, UserRound, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const links = [
  { href: "/dashboard", label: "Проекты", icon: FolderKanban },
  { href: "/dashboard/activity", label: "Активность", icon: Zap },
  { href: "/dashboard/finance", label: "Финансы", icon: BarChart3 },
  { href: "/dashboard/profile", label: "Профиль", icon: UserRound },
];

export function MobileNavigation({ canCreateProject }: { canCreateProject: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end">
        {links.slice(0, 2).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-medium ${pathname === href ? "text-blue-600" : "text-muted-foreground"}`}>
            <Icon className="size-[19px]" strokeWidth={pathname === href ? 2.5 : 1.9} />
            {label}
          </Link>
        ))}
        {canCreateProject ? <Dialog>
          <DialogTrigger className="mx-auto -mt-7 flex size-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_10px_25px_rgba(15,23,42,0.28)] transition hover:scale-105 active:scale-95" aria-label="Добавить">
            <Plus className="size-6" />
          </DialogTrigger>
          <DialogContent className="bottom-0 top-auto max-w-none translate-y-0 rounded-b-none rounded-t-[28px] p-6 pb-9 sm:bottom-1/2 sm:max-w-sm sm:-translate-y-1/2 sm:rounded-[28px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Быстрое действие</DialogTitle>
              <DialogDescription>Выберите, что хотите добавить в проект.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 pt-2">
              <Link href="/dashboard/projects/new" className="rounded-2xl bg-slate-950 px-4 py-4 text-center text-sm font-semibold text-white">Создать проект</Link>
              <p className="px-2 py-2 text-center text-xs leading-5 text-muted-foreground">Откройте проект, чтобы добавить расход или платёж.</p>
            </div>
          </DialogContent>
        </Dialog> : <div aria-hidden="true" />}
        {links.slice(2).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-medium ${pathname === href ? "text-blue-600" : "text-muted-foreground"}`}>
            <Icon className="size-[19px]" strokeWidth={pathname === href ? 2.5 : 1.9} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
