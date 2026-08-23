import { getCurrentUser } from "@/server/auth";
import { getLocale } from "@/i18n/locale";
import { HomeRedirect } from "@/components/home-redirect";

export default async function Home() {
  const user = await getCurrentUser();
  const locale = await getLocale();

  return <HomeRedirect href={user ? "/dashboard" : `/login?lang=${locale}`} />;
}
