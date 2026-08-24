"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, LayoutDashboard, ListTodo, ShieldCheck, UsersRound } from "lucide-react";

type NavigationLabels = {
  dashboard: string;
  projects: string;
  tasks: string;
  employees: string;
  access: string;
};

function isActivePath(pathname: string, href: string, includeNestedRoutes = false) {
  return pathname === href || (includeNestedRoutes && pathname.startsWith(`${href}/`));
}

export function SidebarNavigation({ isAdmin, labels }: { isAdmin: boolean; labels: NavigationLabels }) {
  const pathname = usePathname();
  const links = [
    { href: "/dashboard", label: labels.dashboard, icon: LayoutDashboard },
    { href: "/dashboard", activeHref: "/dashboard/projects", label: labels.projects, icon: FolderKanban },
    { href: "/dashboard/tasks", label: labels.tasks, icon: ListTodo },
    { href: "/dashboard/employees", label: labels.employees, icon: UsersRound },
    ...(isAdmin ? [{ href: "/dashboard/access", label: labels.access, icon: ShieldCheck }] : []),
  ];

  return (
    <nav className="mt-8 grid gap-1">
      {links.map(({ href, activeHref = href, label, icon: Icon }) => {
        const isActive = isActivePath(pathname, activeHref, activeHref !== "/dashboard");

        return (
          <Link
            key={label}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
