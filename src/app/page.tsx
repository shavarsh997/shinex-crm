import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/auth";
import { getLocale } from "@/i18n/locale";

export default async function Home() {
  const user = await getCurrentUser();
  const locale = await getLocale();

  redirect(user ? "/dashboard" : `/login?lang=${locale}`);
}
