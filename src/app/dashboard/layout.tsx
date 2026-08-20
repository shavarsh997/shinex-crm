import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { getCurrentUser } from "@/server/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <div className="min-h-screen bg-muted/30 md:flex"><DashboardSidebar user={user} /><main className="min-w-0 flex-1">{children}</main></div>;
}
