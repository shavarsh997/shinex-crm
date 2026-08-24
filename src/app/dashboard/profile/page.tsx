import { LogOut } from "lucide-react";

import { UserAvatar } from "@/components/users/user-avatar";
import { signOut, getAuthenticatedUser } from "@/server/auth";
import { getTranslations } from "@/i18n/server";

export default async function ProfilePage() {
  const { t } = await getTranslations();
  const user = await getAuthenticatedUser();
  async function logout() { "use server"; await signOut({ redirectTo: "/login" }); }
  return <div className="mx-auto max-w-3xl px-5 pb-28 pt-6 sm:px-8 sm:pt-8"><header><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{t("profile.account")}</p><h1 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-950">{t("profile.title")}</h1></header><section className="mt-6 flex items-center gap-4 rounded-[22px] bg-white p-5 ring-1 ring-slate-200/80"><UserAvatar userId={user.id} name={user.name} email={user.email} className="size-14 rounded-2xl text-sm" /><div className="min-w-0"><p className="truncate font-semibold text-slate-950">{user.name || t("common.user")}</p><p className="truncate text-sm text-slate-500">{user.email}</p></div></section><form action={logout} className="mt-5"><button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 py-3.5 text-sm font-semibold text-rose-600"><LogOut className="size-4" />{t("profile.signOut")}</button></form></div>;
}
