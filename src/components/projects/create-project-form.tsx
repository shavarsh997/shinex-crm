"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateProjectForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  async function submit(data: FormData) {
    setError(null); setPending(true);
    try {
      const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
      const payload = await response.json().catch(() => null) as { project?: { id: string }; error?: { message: string } } | null;
      if (!response.ok || !payload?.project) throw new Error(payload?.error?.message || "Не удалось создать проект.");
      router.push(`/dashboard/projects/${payload.project.id}`); router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось создать проект.");
    } finally {
      setPending(false);
    }
  }

  return <form action={submit} className="grid gap-6"><div><div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-slate-950 text-xs font-semibold text-white">1</span><div className={`h-0.5 flex-1 ${step === 2 ? "bg-slate-950" : "bg-slate-200"}`} /><span className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${step === 2 ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-400"}`}>2</span></div><p className="mt-3 text-xs font-medium text-slate-400">Шаг {step} из 2 · {step === 1 ? "Основная информация" : "Финансы"}</p></div><section className={step === 1 ? "grid gap-4" : "hidden"}><label className="grid gap-1.5 text-sm font-semibold">Название проекта<Input name="title" required placeholder="Квартира — Арабкир" className="h-12 rounded-xl" /></label><label className="grid gap-1.5 text-sm font-semibold">Клиент / владелец<Input name="ownerName" placeholder="Имя клиента" className="h-12 rounded-xl" /></label><label className="grid gap-1.5 text-sm font-semibold">Телефон<Input name="ownerPhone" type="tel" placeholder="+374 …" className="h-12 rounded-xl" /></label><label className="grid gap-1.5 text-sm font-semibold">Описание<Input name="description" placeholder="Ремонт квартиры, 85 м²" className="h-12 rounded-xl" /></label><label className="grid gap-1.5 text-sm font-semibold">Адрес <span className="font-normal text-slate-400">(необязательно)</span><Input name="ownerNotes" placeholder="Ереван, Арабкир" className="h-12 rounded-xl" /></label></section><section className={step === 2 ? "grid gap-4" : "hidden"}><label className="grid gap-1.5 text-sm font-semibold">Смета проекта, AMD<Input name="estimatedAmount" required inputMode="numeric" defaultValue="0" className="h-14 rounded-2xl text-xl font-semibold" /></label><label className="grid gap-1.5 text-sm font-semibold">Первый платёж, AMD<Input name="receivedAmount" inputMode="numeric" defaultValue="0" className="h-12 rounded-xl" /></label><label className="grid gap-1.5 text-sm font-semibold">Валюта<Input value="AMD" disabled className="h-12 rounded-xl bg-slate-50 text-slate-500" /></label><Input name="ownerEmail" type="email" className="hidden" /></section>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex gap-3">{step === 1 ? <Button type="button" size="lg" className="h-12 flex-1 rounded-2xl bg-slate-950" onClick={() => setStep(2)}>Продолжить</Button> : <><Button type="button" variant="outline" size="lg" className="h-12 rounded-2xl" onClick={() => setStep(1)}>Назад</Button><Button size="lg" type="submit" className="h-12 flex-1 rounded-2xl bg-blue-600" disabled={pending}>{pending ? "Создаём…" : "Создать проект"}</Button></>} </div></form>;
}
