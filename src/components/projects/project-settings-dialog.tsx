"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, LockKeyhole, PauseCircle, PlayCircle, Settings2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, ResponsiveDialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/i18n/provider";

type ProjectStatus = "ACTIVE" | "FROZEN" | "COMPLETED";
type Screen = "settings" | "complete-warning" | "complete-code" | "delete-warning" | "delete-code";

type ProjectSettingsDialogProps = {
  projectId: string;
  status: ProjectStatus;
  completedAt: string | null;
  frozenAt: string | null;
  canManageProject: boolean;
  canHardDelete: boolean;
  triggerClassName?: string;
};

export function ProjectSettingsDialog({ projectId, status, completedAt, frozenAt, canManageProject, canHardDelete, triggerClassName = "size-10 rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-950" }: ProjectSettingsDialogProps) {
  const { locale, t } = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("settings");
  const [phrase, setPhrase] = useState("");
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDeleteFlow = screen === "delete-warning" || screen === "delete-code";
  const canChangeState = canManageProject && status !== "FROZEN" && status !== "COMPLETED";

  function reset() { setScreen("settings"); setPhrase(""); setInput(""); setPending(false); setError(null); }
  function close(nextOpen: boolean) { setOpen(nextOpen); if (!nextOpen) reset(); }

  async function changeProjectState(action: "freeze" | "resume") {
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/${action}`, { method: "POST" });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message || t("project.stateUpdateFailed"));
      close(false); router.refresh();
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : t("project.stateUpdateFailed")); } finally { setPending(false); }
  }

  async function requestChallenge(flow: "complete" | "delete") {
    setPending(true); setError(null);
    try {
      const suffix = flow === "delete" ? "hard-delete-challenge" : "completion-challenge";
      const response = await fetch(`/api/projects/${projectId}/${suffix}`);
      const payload = await response.json().catch(() => null) as { phrase?: string; error?: { message?: string } } | null;
      if (!response.ok || !payload?.phrase) throw new Error(payload?.error?.message || t("project.challengeFailed"));
      setPhrase(payload.phrase); setScreen(flow === "delete" ? "delete-code" : "complete-code");
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : t("project.challengeFailed")); } finally { setPending(false); }
  }

  async function submitConfirmation(flow: "complete" | "delete") {
    setPending(true); setError(null);
    try {
      const suffix = flow === "delete" ? "hard-delete" : "complete";
      const response = await fetch(`/api/projects/${projectId}/${suffix}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phrase: input }) });
      const payload = await response.json().catch(() => null) as { error?: { details?: Array<{ message?: string }>; message?: string } } | null;
      const fallback = flow === "delete" ? t("project.deleteFailed") : t("project.completeFailed");
      if (!response.ok) throw new Error(payload?.error?.details?.[0]?.message || payload?.error?.message || fallback);
      close(false);
      if (flow === "delete") router.replace("/dashboard");
      router.refresh();
    } catch (caughtError) {
      const fallback = flow === "delete" ? t("project.deleteFailed") : t("project.completeFailed");
      setError(caughtError instanceof Error ? caughtError.message : fallback);
    } finally { setPending(false); }
  }

  const date = (value: string | null) => value && new Intl.DateTimeFormat(locale === "hy" ? "hy-AM" : "ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
  const title = screen === "settings" ? t("project.settingsTitle") : screen === "complete-warning" ? t("project.completeWarningTitle") : screen === "delete-warning" ? t("project.deleteTitle") : isDeleteFlow ? t("project.deleteAction") : t("project.completeCodeTitle");
  const description = screen === "settings" ? `${t("project.settingsDescription")} ${t("project.adminDeleteHint")}` : screen === "complete-warning" ? t("project.completeWarningDescription") : screen === "delete-warning" ? t("project.deleteDescription") : t("project.completeCodeDescription");

  return <Dialog open={open} onOpenChange={close}><DialogTrigger render={<Button aria-label={t("project.settings")} variant="ghost" size="icon" className={triggerClassName} />}><Settings2 className="size-5" /></DialogTrigger><ResponsiveDialogContent className="p-5 pb-8 sm:p-7"><DialogHeader><DialogTitle className="text-xl tracking-[-0.035em]">{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
    {screen === "settings" && <div className="mt-5 grid gap-3">
      {canChangeState && <><section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-950"><div className="flex gap-3"><PauseCircle className="mt-0.5 size-5 shrink-0 text-blue-600" /><div><p className="font-semibold">{t("project.freeze")}</p><p className="mt-1 text-sm leading-5 text-slate-600">{t("project.freezeDescription")}</p></div></div><Button type="button" variant="outline" className="mt-4 w-full rounded-xl bg-white text-slate-950" disabled={pending} onClick={() => void changeProjectState("freeze")}><PauseCircle className="size-4" />{pending ? t("project.freezing") : t("project.freeze")}</Button></section><section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-amber-700" /><div><p className="font-semibold">{t("project.complete")}</p><p className="mt-1 text-sm leading-5 text-amber-900/75">{t("project.completeDescription")}</p></div></div><Button type="button" variant="outline" className="mt-4 w-full rounded-xl border-amber-300 bg-white text-amber-800 hover:bg-amber-100" disabled={pending} onClick={() => { setError(null); setScreen("complete-warning"); }}><CheckCircle2 className="size-4" />{t("project.complete")}</Button></section></>}
      {canManageProject && status === "FROZEN" && <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="flex gap-3"><PauseCircle className="mt-0.5 size-5 shrink-0 text-blue-600" /><div><p className="font-semibold text-blue-950">Проект заморожен</p><p className="mt-1 text-sm leading-5 text-blue-900/75">{date(frozenAt) && `Заморожен ${date(frozenAt)}. `}Операции и новые задачи временно остановлены.</p></div></div><Button type="button" className="mt-4 w-full rounded-xl bg-blue-600 hover:bg-blue-700" disabled={pending} onClick={() => void changeProjectState("resume")}><PlayCircle className="size-4" />{pending ? "Возобновляем…" : "Возобновить проект"}</Button></section>}
      {canManageProject && status === "COMPLETED" && <section className="rounded-2xl bg-emerald-50 p-4 text-emerald-950"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /><div><p className="font-semibold">Проект завершён</p><p className="mt-1 text-sm leading-5 text-emerald-800">{date(completedAt) && `Завершён ${date(completedAt)}. `}Он доступен только для просмотра.</p></div></div></section>}
      {canHardDelete && <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-950"><div className="flex gap-3"><Trash2 className="mt-0.5 size-5 shrink-0 text-red-700" /><div><p className="font-semibold">{t("project.deleteTitle")}</p><p className="mt-1 text-sm leading-5 text-red-900/80">{t("project.deleteDescription")}</p></div></div><Button type="button" variant="destructive" className="mt-4 w-full rounded-xl" disabled={pending} onClick={() => { setError(null); setScreen("delete-warning"); }}><Trash2 className="size-4" />{t("project.delete")}</Button></section>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>}
    {screen === "complete-warning" && <div className="mt-5"><div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><p className="text-sm leading-6">После завершения проект нельзя будет возобновить. Проверьте, что все операции уже внесены.</p></div>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}<div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" className="rounded-xl" onClick={() => setScreen("settings")}>Назад</Button><Button type="button" variant="destructive" className="rounded-xl" disabled={pending} onClick={() => void requestChallenge("complete")}>{pending ? "Готовим…" : "Продолжить"}</Button></div></div>}
    {screen === "delete-warning" && <div className="mt-5"><div className="flex gap-3 rounded-2xl bg-red-50 p-4 text-red-950"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><p className="text-sm leading-6">{t("project.deleteWarning")}</p></div>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}<div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" className="rounded-xl" onClick={() => setScreen("settings")}>{t("form.back")}</Button><Button type="button" variant="destructive" className="rounded-xl" disabled={pending} onClick={() => void requestChallenge("delete")}>{pending ? t("project.preparing") : t("form.continue")}</Button></div></div>}
    {(screen === "complete-code" || screen === "delete-code") && <div className="mt-5"><div className="rounded-2xl bg-slate-950 p-4 text-white"><div className="flex items-center gap-2 text-sm text-slate-300"><LockKeyhole className="size-4" />Код подтверждения</div><p className="mt-2 select-none font-mono text-lg font-bold tracking-[0.12em]">{phrase}</p></div><label className="mt-5 grid gap-2 text-sm font-semibold text-slate-700">Введите код полностью<Input autoComplete="off" autoCapitalize="characters" value={input} onChange={(event) => setInput(event.target.value.toUpperCase())} placeholder={phrase} className="h-12 rounded-xl font-mono tracking-wide" /></label>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}<div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" className="rounded-xl" disabled={pending} onClick={() => setScreen("settings")}>Назад</Button><Button type="button" variant="destructive" className="rounded-xl" disabled={pending || input !== phrase} onClick={() => void submitConfirmation(isDeleteFlow ? "delete" : "complete")}>{pending ? (isDeleteFlow ? "Удаляем…" : "Завершаем…") : (isDeleteFlow ? "Удалить безвозвратно" : "Завершить проект")}</Button></div></div>}
  </ResponsiveDialogContent></Dialog>;
}
