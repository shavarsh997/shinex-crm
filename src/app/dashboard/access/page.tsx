import { AccessManagement } from "@/components/dashboard/access-management";
import { TelegramIntegrationSync } from "@/components/dashboard/telegram-integration-sync";
import { requireAdmin } from "@/server/auth";
import { getUsersForAccessManagement } from "@/server/modules/users/users.service";
import { getTranslations } from "@/i18n/server";

export default async function AccessPage() {
  const { t } = await getTranslations();
  const administrator = await requireAdmin();
  const users = await getUsersForAccessManagement();

  return (
    <div className="mx-auto max-w-4xl p-5 sm:p-8">
      <header className="mb-7">
        <p className="text-sm text-muted-foreground">{t("access.admin")}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t("access.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("access.description")}</p>
      </header>
      <div className="mb-4">
        <TelegramIntegrationSync />
      </div>
      <AccessManagement currentUserId={administrator.id} users={users} />
    </div>
  );
}
