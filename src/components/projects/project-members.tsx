"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Eye, PencilLine, Plus, Trash2, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, ResponsiveDialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/users/user-avatar";
import { useTranslations } from "@/i18n/provider";
import { confirmationHeaders, requestConfirmationChallenge, requestConfirmationCode } from "@/lib/confirmation";

type ProjectUser = { id: string; name: string | null; email: string | null };
type ProjectMember = { userId: string; role: "EDITOR" | "VIEWER"; user: ProjectUser };
type MemberConfirmation = { phrase: string; user: ProjectUser; role: "EDITOR" | "VIEWER" };

export function ProjectMembers({ projectId, owner, members, availableUsers, canManage }: { projectId: string; owner: ProjectUser; members: ProjectMember[]; availableUsers: ProjectUser[]; canManage: boolean }) {
  const { t } = useTranslations(); const router = useRouter(); const [open, setOpen] = useState(false); const [selectedUserId, setSelectedUserId] = useState(availableUsers[0]?.id || ""); const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR"); const [pending, setPending] = useState(false); const [removingId, setRemovingId] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const name = (user: ProjectUser) => user.name || user.email || t("project.unnamedUser");
  const selectedUser = availableUsers.find((user) => user.id === selectedUserId) ?? availableUsers[0];
  const [confirmation, setConfirmation] = useState<MemberConfirmation | null>(null);
  const [code, setCode] = useState("");

  function resetConfirmation() { setConfirmation(null); setCode(""); setError(null); }

  async function addMember() {
    if (!selectedUser || pending) return;
    setPending(true); setError(null);
    try {
      const phrase = await requestConfirmationChallenge("project-member-add", projectId);
      setCode("");
      setConfirmation({ phrase, user: selectedUser, role });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("project.challengeFailed"));
    } finally { setPending(false); }
  }

  async function confirmAddMember() {
    if (!confirmation || code !== confirmation.phrase || pending) return;
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...confirmationHeaders(code) },
        body: JSON.stringify({ userId: confirmation.user.id, role: confirmation.role }),
      });
      const payload = await response.json().catch(() => null) as { error?: { message?: string; details?: Array<{ message?: string }> } } | null;
      if (!response.ok) throw new Error(payload?.error?.details?.[0]?.message || payload?.error?.message || t("project.memberAddFailed"));
      setOpen(false); resetConfirmation(); router.refresh();
    } catch (caughtError) {
      // The server may consume the challenge before the member mutation fails.
      // Every retry must request a fresh code.
      setConfirmation(null); setCode("");
      setError(caughtError instanceof Error ? caughtError.message : t("project.memberAddFailed"));
    } finally { setPending(false); }
  }
  async function removeMember(memberId: string) { if (!window.confirm(t("project.removeMemberConfirm"))) return; setRemovingId(memberId); setError(null); try { const code = await requestConfirmationCode("project-member-remove", `${projectId}_${memberId}`, (phrase) => t("confirmation.prompt", { phrase })); if (!code) return; const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, { method: "DELETE", headers: confirmationHeaders(code) }); const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null; if (!response.ok) throw new Error(payload?.error?.message || t("project.memberRemoveFailed")); router.refresh(); } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : t("project.memberRemoveFailed")); } finally { setRemovingId(null); } }
  return <section className="mt-7 rounded-[22px] bg-white p-5 ring-1 ring-slate-200/80"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-violet-50 text-violet-600"><UsersRound className="size-5" /></span><div><h2 className="font-semibold text-slate-950">{t("project.team")}</h2><p className="mt-0.5 text-sm text-slate-500">{t("project.teamCount", { count: members.length + 1 })}</p></div></div>{canManage && <Dialog open={open} onOpenChange={(nextOpen) => { if (pending) return; setOpen(nextOpen); if (!nextOpen) resetConfirmation(); }}><DialogTrigger render={<Button size="lg" className="h-10 rounded-xl bg-slate-950 text-white hover:bg-slate-800" />}><Plus className="size-4" />{t("common.add")}</DialogTrigger><ResponsiveDialogContent className="p-5 pb-8 sm:p-7"><DialogHeader><DialogTitle className="text-xl tracking-[-0.035em]">{t("project.addMember")}</DialogTitle><DialogDescription>{t(confirmation ? "project.completeCodeDescription" : "project.addMemberDescription")}</DialogDescription></DialogHeader>{confirmation ? <form action={confirmAddMember} className="mt-5 grid gap-5">
        <p className="text-sm text-slate-600">{name(confirmation.user)} · {t(confirmation.role === "EDITOR" ? "project.editor" : "project.viewer")}</p>
        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <p className="text-sm text-slate-300">{t("project.confirmationCode")}</p>
          <p className="mt-2 select-none font-mono text-2xl font-bold tracking-[0.2em]">{confirmation.phrase}</p>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">{t("project.enterConfirmationCode")}
          <Input autoFocus autoComplete="off" inputMode="numeric" pattern="[0-9]{3}" maxLength={3} value={code} disabled={pending} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 3))} className="h-12 rounded-xl font-mono tracking-wide" />
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" disabled={pending} onClick={resetConfirmation}>{t("form.back")}</Button>
          <Button type="submit" disabled={pending || code !== confirmation.phrase} className="bg-violet-600 hover:bg-violet-700">{pending ? t("common.saving") : t("project.grantAccess")}</Button>
        </div>
      </form> : availableUsers.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{t("project.noAvailableMembers")}</p> : <form action={addMember} className="mt-5 grid gap-5"><label className="grid gap-2 text-sm font-semibold text-slate-700">{t("common.user")}<select required disabled={pending} value={selectedUser?.id ?? ""} onChange={(event) => setSelectedUserId(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:ring-3 focus:ring-violet-100">{availableUsers.map((user) => <option key={user.id} value={user.id}>{name(user)}{user.email && user.name ? ` — ${user.email}` : ""}</option>)}</select></label><div><p className="mb-2 text-sm font-semibold text-slate-700">{t("project.accessLevel")}</p><div className="grid grid-cols-2 gap-2"><button type="button" disabled={pending} onClick={() => setRole("EDITOR")} className={`rounded-2xl border p-4 text-left transition ${role === "EDITOR" ? "border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-100" : "border-slate-200 text-slate-600"}`}><PencilLine className="size-5" /><p className="mt-2 text-sm font-semibold">{t("project.editor")}</p><p className="mt-1 text-xs">{t("project.editorDescription")}</p></button><button type="button" disabled={pending} onClick={() => setRole("VIEWER")} className={`rounded-2xl border p-4 text-left transition ${role === "VIEWER" ? "border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-100" : "border-slate-200 text-slate-600"}`}><Eye className="size-5" /><p className="mt-2 text-sm font-semibold">{t("project.viewer")}</p><p className="mt-1 text-xs">{t("project.viewerDescription")}</p></button></div></div>{selectedUser && members.some((member) => member.userId === selectedUser.id) && <p className="text-sm text-slate-500">{t("project.alreadyMember")}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" size="lg" className="h-12 rounded-2xl bg-violet-600 hover:bg-violet-700" disabled={pending}>{pending ? t("common.saving") : t("project.grantAccess")}</Button></form>}</ResponsiveDialogContent></Dialog>}</div><div className="mt-5 grid gap-2 border-t border-slate-100 pt-4"><article className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5"><div className="flex min-w-0 items-center gap-3"><UserAvatar userId={owner.id} name={owner.name} email={owner.email} className="size-9 rounded-xl text-xs" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{name(owner)}</p><p className="truncate text-xs text-slate-500"><Crown className="mr-1 inline size-3 align-[-0.1em] text-amber-600" />{t("project.ownerAccess")}</p></div></div></article>{members.map((member) => <article key={member.userId} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-2.5"><div className="flex min-w-0 items-center gap-3"><UserAvatar userId={member.user.id} name={member.user.name} email={member.user.email} className="size-9 rounded-xl text-xs" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{name(member.user)}</p><p className="truncate text-xs text-slate-500">{member.role === "EDITOR" ? t("project.canEdit") : t("project.canView")}</p></div></div>{canManage && <Button aria-label={t("project.removeMember", { name: name(member.user) })} variant="ghost" size="icon-sm" disabled={removingId === member.userId} onClick={() => removeMember(member.userId)}><Trash2 className="text-destructive" /></Button>}</article>)}</div>{error && !open && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}</section>;
}
