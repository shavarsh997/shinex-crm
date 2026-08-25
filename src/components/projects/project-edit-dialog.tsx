"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, ResponsiveDialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/i18n/provider";
import { confirmationHeaders, requestConfirmationCode } from "@/lib/confirmation";

type ProjectDetails = {
  id: string;
  title: string;
  description: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  ownerNotes: string | null;
};

export function ProjectEditDialog({ project }: { project: ProjectDetails }) {
  const { t } = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setError(null);
  }

  async function submit(data: FormData) {
    setPending(true);
    setError(null);
    try {
      const code = await requestConfirmationCode("project-update", project.id, (phrase) => t("confirmation.prompt", { phrase }));
      if (!code) return;
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...confirmationHeaders(code) },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message || t("project.updateFailed"));

      changeOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("project.updateFailed"));
    } finally {
      setPending(false);
    }
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger render={<Button aria-label={t("project.edit")} variant="ghost" size="icon" className="size-10 rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-950" />}><Pencil className="size-4" /></DialogTrigger>
    <ResponsiveDialogContent className="p-5 pb-8 sm:p-7">
      <DialogHeader>
        <DialogTitle className="text-xl tracking-[-0.035em]">{t("project.editTitle")}</DialogTitle>
        <DialogDescription>{t("project.editDescription")}</DialogDescription>
      </DialogHeader>
      <form action={submit} className="mt-5 grid gap-4">
        <label className="grid gap-1.5 text-sm font-semibold">{t("form.projectTitle")}<Input required name="title" defaultValue={project.title} className="h-12 rounded-xl" /></label>
        <label className="grid gap-1.5 text-sm font-semibold">{t("form.owner")}<Input name="ownerName" defaultValue={project.ownerName || ""} className="h-12 rounded-xl" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold">{t("form.phone")}<Input name="ownerPhone" type="tel" defaultValue={project.ownerPhone || ""} className="h-12 rounded-xl" /></label>
          <label className="grid gap-1.5 text-sm font-semibold">Email<Input name="ownerEmail" type="email" defaultValue={project.ownerEmail || ""} className="h-12 rounded-xl" /></label>
        </div>
        <label className="grid gap-1.5 text-sm font-semibold">{t("form.description")}<textarea name="description" defaultValue={project.description || ""} rows={3} className="min-h-24 resize-y rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" /></label>
        <label className="grid gap-1.5 text-sm font-semibold">{t("project.addressNote")}<textarea name="ownerNotes" defaultValue={project.ownerNotes || ""} rows={2} className="resize-y rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="mt-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700" disabled={pending}>{pending ? t("common.saving") : t("payment.saveChanges")}</Button>
      </form>
    </ResponsiveDialogContent>
  </Dialog>;
}
