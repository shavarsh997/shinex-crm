import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, WalletCards } from "lucide-react";
import { ExternalFundsLedger } from "@/components/external-funds/external-funds-ledger";
import { getAuthenticatedUser } from "@/server/auth";
import { getProjectExternalFunds } from "@/server/modules/external-funds/external-funds.service";
import { serializeExternalFundEntry } from "@/server/shared/serializers/financial";
import { NotFoundError } from "@/server/shared/errors";
import { getTranslations } from "@/i18n/server";
import { formatMoney } from "@/lib/money";

export default async function ProjectExternalFundsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { locale, t } = await getTranslations();
  const user = await getAuthenticatedUser();
  const { projectId } = await params;
  let data;
  try {
    data = await getProjectExternalFunds(user.id, user.role, projectId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const { project, entries, totals } = data;
  const summary = [
    { label: t("externalFunds.received"), value: totals.received },
    { label: t("externalFunds.spent"), value: totals.spent },
    { label: t("externalFunds.balance"), value: totals.balance },
  ];

  return <div className="mx-auto max-w-4xl px-5 pb-28 pt-5 sm:px-8 sm:pt-8">
    <header className="flex items-center gap-3">
      <Link href={`/dashboard/projects/${project.id}`} aria-label={t("payment.back")} className="grid size-10 shrink-0 place-items-center rounded-full bg-card ring-1 ring-border"><ArrowLeft className="size-5" /></Link>
      <div><p className="text-xs text-muted-foreground">{project.title}</p><h1 className="text-xl font-semibold tracking-tight">{t("externalFunds.title")}</h1></div>
    </header>
    <section className="mt-6 rounded-3xl bg-violet-500/5 p-5 ring-1 ring-violet-500/20">
      <div className="flex items-start gap-3"><WalletCards className="mt-0.5 size-5 shrink-0 text-violet-600 dark:text-violet-400" /><p className="max-w-xl text-sm text-muted-foreground">{t("externalFunds.description")}</p></div>
      <dl className="mt-6 grid gap-5 sm:grid-cols-3">{summary.map((item) => <div key={item.label}><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className={`mt-2 break-words text-xl font-semibold tracking-tight ${item.value < 0n ? "text-destructive" : ""}`}>{formatMoney(item.value, locale)}</dd></div>)}</dl>
      {totals.balance < 0n && <p className="mt-5 text-sm text-destructive">{t("externalFunds.shortfall", { amount: formatMoney(-totals.balance, locale) })}</p>}
    </section>
    <ExternalFundsLedger projectId={project.id} entries={entries.map(serializeExternalFundEntry)} canEdit={project.canEdit && project.status === "ACTIVE"} />
  </div>;
}
