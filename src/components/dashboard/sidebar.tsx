import Link from "next/link";
import { FolderKanban, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { MobileNavigation } from "./mobile-navigation";

import { signOut } from "@/server/auth";

export function DashboardSidebar({ user }: { user: { name?: string | null; email?: string | null; role?: "ADMIN" | "MANAGER" | "MEMBER" } }) {
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return <><aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex"><div className="p-5"><Link href="/dashboard" className="font-semibold tracking-tight">SHINEX <span className="text-muted-foreground">CRM</span></Link><nav className="mt-8 grid gap-1"><Link className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-medium" href="/dashboard"><LayoutDashboard className="size-4" />Dashboard</Link><Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" href="/dashboard"><FolderKanban className="size-4" />Projects</Link>{user.role === "ADMIN" && <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" href="/dashboard/access"><ShieldCheck className="size-4" />Доступы</Link>}</nav></div><div className="mt-auto border-t p-4"><p className="truncate text-sm font-medium">{user.name || "Пользователь"}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p><form action={logout} className="mt-3"><button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" type="submit"><LogOut className="size-4" />Выйти</button></form></div></aside><MobileNavigation /></>;
}
