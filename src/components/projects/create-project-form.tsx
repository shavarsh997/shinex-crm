"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateProjectForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(data: FormData) {
    setError(null); setPending(true);
    const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
    const payload = await response.json() as { project?: { id: string }; error?: { message: string } };
    if (!response.ok || !payload.project) { setError(payload.error?.message || "Не удалось создать проект."); setPending(false); return; }
    router.push(`/dashboard/projects/${payload.project.id}`); router.refresh();
  }

  return <form action={submit} className="grid gap-6"><section className="grid gap-4"><h2 className="font-medium">Основная информация</h2><label className="grid gap-1.5 text-sm font-medium">Название проекта<Input name="title" required placeholder="Ремонт квартиры — Arabkir" /></label><label className="grid gap-1.5 text-sm font-medium">Описание<textarea name="description" rows={3} className="w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" placeholder="Коротко о проекте" /></label></section><section className="grid gap-4 border-t pt-6"><h2 className="font-medium">Бюджет</h2><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">Смета, ֏<Input name="estimatedAmount" inputMode="numeric" defaultValue="0" /></label><label className="grid gap-1.5 text-sm font-medium">Получено, ֏<Input name="receivedAmount" inputMode="numeric" defaultValue="0" /></label></div></section><section className="grid gap-4 border-t pt-6"><h2 className="font-medium">Клиент <span className="font-normal text-muted-foreground">(необязательно)</span></h2><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">Имя<Input name="ownerName" /></label><label className="grid gap-1.5 text-sm font-medium">Телефон<Input name="ownerPhone" type="tel" /></label><label className="grid gap-1.5 text-sm font-medium">Email<Input name="ownerEmail" type="email" /></label><label className="grid gap-1.5 text-sm font-medium">Заметка<Input name="ownerNotes" /></label></div></section>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex gap-3"><Button size="lg" type="submit" disabled={pending}>{pending ? "Создаём…" : "Создать проект"}</Button><Button type="button" variant="outline" size="lg" onClick={() => router.back()}>Отмена</Button></div></form>;
}
