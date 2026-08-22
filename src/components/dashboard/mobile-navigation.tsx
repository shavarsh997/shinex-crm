"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Ellipsis, FolderKanban, ListTodo, ShieldCheck, UserRound, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "@/i18n/provider";

export function MobileNavigation({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslations();
  const primaryLinks = [
    { href: "/dashboard", label: t("nav.projects"), icon: FolderKanban },
    { href: "/dashboard/tasks", label: t("nav.tasks"), icon: ListTodo },
  ];
  const moreLinks = [
    { href: "/dashboard/activity", label: t("nav.activity"), icon: Zap },
    { href: "/dashboard/finance", label: t("nav.finance"), icon: BarChart3 },
    { href: "/dashboard/profile", label: t("nav.profile"), icon: UserRound },
    ...(isAdmin ? [{ href: "/dashboard/access", label: t("nav.access"), icon: ShieldCheck }] : []),
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 items-end">
        {primaryLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-medium ${pathname === href ? "text-blue-600" : "text-muted-foreground"}`}>
            <Icon className="size-[19px]" strokeWidth={pathname === href ? 2.5 : 1.9} />
            {label}
          </Link>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger className={`flex min-h-12 w-full flex-col items-center justify-center gap-1 text-[10px] font-medium ${moreLinks.some(({ href }) => pathname === href) ? "text-blue-600" : "text-muted-foreground"}`} aria-label={t("nav.more")}>
            <Ellipsis className="size-[21px]" strokeWidth={2} />
            {t("nav.more")}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="mb-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl p-2 shadow-xl">
            {moreLinks.map(({ href, label, icon: Icon }) => (
              <DropdownMenuItem key={href} onClick={() => router.push(href)} className="min-h-14 gap-3 rounded-xl px-4 py-3 text-base [&_svg]:size-5">
                <Icon aria-hidden="true" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
