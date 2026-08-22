import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getTranslations } from "@/i18n/server";

export default async function DashboardNotFound() { const { t } = await getTranslations(); return <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center"><h1 className="text-lg font-semibold">{t("notFound.projectTitle")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("notFound.projectDescription")}</p><Link href="/dashboard" className={`${buttonVariants()} mt-5`}>{t("notFound.backToProjects")}</Link></div>; }
