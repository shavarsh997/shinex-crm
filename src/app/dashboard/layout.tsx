import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { ConfirmationGuard } from "@/components/security/confirmation-guard";
import { TelegramWebAppBridge } from "@/components/telegram/telegram-web-app";
import { getAuthenticatedUser } from "@/server/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  return <div className="min-h-screen bg-background md:flex"><ConfirmationGuard /><TelegramWebAppBridge /><DashboardSidebar user={user} /><main className="min-w-0 flex-1">{children}</main></div>;
}
