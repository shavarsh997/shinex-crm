import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return <main className="flex min-h-screen items-center justify-center bg-muted/40 p-5"><section className="w-full max-w-sm rounded-2xl bg-card p-7 shadow-sm ring-1 ring-foreground/10"><p className="mb-2 text-sm font-medium text-primary">SHINEX</p><h1 className="text-2xl font-semibold">Вход в CRM</h1><p className="mb-6 mt-2 text-sm text-muted-foreground">Вход доступен только через Google.</p><LoginForm accessDenied={error === "AccessDenied"} /></section></main>;
}
