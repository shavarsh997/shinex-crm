import { redirect } from "next/navigation";
import { getTranslations } from "@/i18n/server";

import { getCurrentUser } from "@/server/auth";

export default async function NotFound() {
  const { t } = await getTranslations();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-5">
      <section className="w-full max-w-sm rounded-2xl bg-card p-7 text-center shadow-sm ring-1 ring-foreground/10">
        <h1 className="text-2xl font-semibold">{t("notFound.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFound.description")}</p>
      </section>
    </main>
  );
}
