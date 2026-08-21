"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Eye, PencilLine, Plus, Trash2, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, ResponsiveDialogContent } from "@/components/ui/dialog";

type ProjectUser = { id: string; name: string | null; email: string | null };
type ProjectMember = { userId: string; role: "EDITOR" | "VIEWER"; user: ProjectUser };

function userName(user: ProjectUser) {
  return user.name || user.email || "Пользователь";
}

export function ProjectMembers({ projectId, owner, members, availableUsers, canManage }: { projectId: string; owner: ProjectUser; members: ProjectMember[]; availableUsers: ProjectUser[]; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(availableUsers[0]?.id || "");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [pending, setPending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedUser = useMemo(() => availableUsers.find((user) => user.id === selectedUserId), [availableUsers, selectedUserId]);

  async function addMember() {
    if (!selectedUserId) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selectedUserId, role }) });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message || "Не удалось выдать доступ к проекту.");
      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось выдать доступ к проекту.");
    } finally {
      setPending(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!window.confirm("Удалить доступ этого пользователя к проекту?")) return;
    setRemovingId(memberId);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message || "Не удалось удалить участника.");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось удалить участника.");
    } finally {
      setRemovingId(null);
    }
  }

  return <section className="mt-7 rounded-[22px] bg-white p-5 ring-1 ring-slate-200/80"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-violet-50 text-violet-600"><UsersRound className="size-5" /></span><div><h2 className="font-semibold text-slate-950">Команда проекта</h2><p className="mt-0.5 text-sm text-slate-500">В команде: {members.length + 1}</p></div></div>{canManage && <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setError(null); }}><DialogTrigger render={<Button size="lg" className="h-10 rounded-xl bg-slate-950 text-white hover:bg-slate-800" />}><Plus className="size-4" />Добавить</DialogTrigger><ResponsiveDialogContent className="p-5 pb-8 sm:p-7"><DialogHeader><DialogTitle className="text-xl tracking-[-0.035em]">Добавить участника</DialogTitle><DialogDescription>Выберите подтверждённого пользователя CRM и уровень доступа к этому проекту.</DialogDescription></DialogHeader>{availableUsers.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Нет других активных пользователей, которым можно выдать доступ.</p> : <form action={addMember} className="mt-5 grid gap-5"><label className="grid gap-2 text-sm font-semibold text-slate-700">Пользователь<select required value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:ring-3 focus:ring-violet-100">{availableUsers.map((user) => <option key={user.id} value={user.id}>{userName(user)}{user.email && user.name ? ` — ${user.email}` : ""}</option>)}</select></label><div><p className="mb-2 text-sm font-semibold text-slate-700">Уровень доступа</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setRole("EDITOR")} className={`rounded-2xl border p-4 text-left transition ${role === "EDITOR" ? "border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-100" : "border-slate-200 text-slate-600"}`}><PencilLine className="size-5" /><p className="mt-2 text-sm font-semibold">Редактор</p><p className="mt-1 text-xs">Добавляет и изменяет операции</p></button><button type="button" onClick={() => setRole("VIEWER")} className={`rounded-2xl border p-4 text-left transition ${role === "VIEWER" ? "border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-100" : "border-slate-200 text-slate-600"}`}><Eye className="size-5" /><p className="mt-2 text-sm font-semibold">Просмотр</p><p className="mt-1 text-xs">Видит данные без изменений</p></button></div></div>{selectedUser && members.some((member) => member.userId === selectedUser.id) && <p className="text-sm text-slate-500">Пользователь уже добавлен — уровень доступа будет обновлён.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" size="lg" className="h-12 rounded-2xl bg-violet-600 hover:bg-violet-700" disabled={pending}>{pending ? "Сохраняем…" : "Выдать доступ"}</Button></form>}</ResponsiveDialogContent></Dialog>}</div><div className="mt-5 grid gap-2 border-t border-slate-100 pt-4"><article className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><Crown className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{userName(owner)}</p><p className="truncate text-xs text-slate-500">Создатель проекта · полный доступ</p></div></div></article>{members.map((member) => <article key={member.userId} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-2.5"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">{member.role === "EDITOR" ? <PencilLine className="size-4" /> : <Eye className="size-4" />}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{userName(member.user)}</p><p className="truncate text-xs text-slate-500">{member.role === "EDITOR" ? "Может редактировать проект" : "Только просмотр"}</p></div></div>{canManage && <Button aria-label={`Удалить доступ ${userName(member.user)}`} variant="ghost" size="icon-sm" disabled={removingId === member.userId} onClick={() => removeMember(member.userId)}><Trash2 className="text-destructive" /></Button>}</article>)}</div>{error && !open && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}</section>;
}
