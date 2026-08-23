"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Client navigation keeps the document (and Telegram.WebApp.initData) intact.
 * A server 307 from `/` would drop the Mini App hash before the SDK can read it.
 */
export function HomeRedirect({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [href, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-5">
      <p className="text-sm text-muted-foreground">Shinex CRM</p>
    </main>
  );
}
