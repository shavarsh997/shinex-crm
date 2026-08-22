"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/i18n/provider";

export function CreateProjectForm() {
  const { t } = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [clientRequestId] = useState(() => crypto.randomUUID());

  async function submit(data: FormData) {
    setError(null); setPending(true);
    try {
      const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(data), clientRequestId }) });
      const payload = await response.json().catch(() => null) as { project?: { id: string }; error?: { message: string } } | null;
      if (!response.ok || !payload?.project) throw new Error(payload?.error?.message || t("form.createProjectFailed"));
      router.push(`/dashboard/projects/${payload.project.id}`); router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("form.createProjectFailed"));
    } finally {
      setPending(false);
    }
  }

  return <form action={submit} className="grid gap-6"><div><div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-slate-950 text-xs font-semibold text-white">1</span><div className={`h-0.5 flex-1 ${step === 2 ? "bg-slate-950" : "bg-slate-200"}`} /><span className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${step === 2 ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-400"}`}>2</span></div><p className="mt-3 text-xs font-medium text-slate-400">{t("form.step", { step, name: step === 1 ? t("form.mainInfo") : t("form.finances") })}</p></div><section className={step === 1 ? "grid gap-4" : "hidden"}><label className="grid gap-1.5 text-sm font-semibold">{t("form.projectTitle")}<Input name="title" required placeholder={t("form.projectPlaceholder")} className="h-12 rounded-xl" /></label><label className="grid gap-1.5 text-sm font-semibold">{t("form.owner")}<Input name="ownerName" placeholder={t("form.clientPlaceholder")} className="h-12 rounded-xl" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-semibold">{t("form.phone")}<Input name="ownerPhone" type="tel" placeholder="+374 …" className="h-12 rounded-xl" /></label><label className="grid gap-1.5 text-sm font-semibold">Email <span className="font-normal text-slate-400">({t("common.optional")})</span><Input name="ownerEmail" type="email" placeholder="client@example.com" className="h-12 rounded-xl" /></label></div><label className="grid gap-1.5 text-sm font-semibold">{t("form.description")}<textarea name="description" rows={3} placeholder={t("form.descriptionPlaceholder")} className="min-h-24 resize-y rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30" /></label><label className="grid gap-1.5 text-sm font-semibold">{t("form.address")} <span className="font-normal text-slate-400">({t("common.optional")})</span><Input name="ownerNotes" placeholder={t("form.addressPlaceholder")} className="h-12 rounded-xl" /></label></section><section className={step === 2 ? "grid gap-4" : "hidden"}><label className="grid gap-1.5 text-sm font-semibold">{t("form.estimate")}<Input name="estimatedAmount" required inputMode="numeric" defaultValue="0" className="h-14 rounded-2xl text-xl font-semibold" /></label><label className="grid gap-1.5 text-sm font-semibold">{t("form.firstPayment")}<Input name="receivedAmount" inputMode="numeric" defaultValue="0" className="h-12 rounded-xl" /></label><label className="grid gap-1.5 text-sm font-semibold">{t("form.currency")}<Input value="AMD" disabled className="h-12 rounded-xl bg-slate-50 text-slate-500" /></label></section>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex gap-3">{step === 1 ? <Button type="button" size="lg" className="h-12 flex-1 rounded-2xl bg-slate-950 text-white" onClick={() => setStep(2)}>{t("form.continue")}</Button> : <><Button type="button" variant="outline" size="lg" className="h-12 rounded-2xl" onClick={() => setStep(1)}>{t("form.back")}</Button><Button size="lg" type="submit" className="h-12 flex-1 rounded-2xl bg-blue-600 text-white" disabled={pending}>{pending ? t("form.creating") : t("project.create")}</Button></>} </div></form>;
}
