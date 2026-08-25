"use client";

import { useEffect } from "react";

import type { ConfirmationAction } from "@/lib/confirmation";
import { useTranslations } from "@/i18n/provider";

type Challenge = { action: ConfirmationAction; resourceId: string };

function getChallenge(pathname: string, method: string): Challenge | null {
  const match = (pattern: RegExp, action: ConfirmationAction, resource: (groups: string[]) => string = (groups) => groups[1]) => {
    const result = pathname.match(pattern);
    return result ? { action, resourceId: resource(result) } : null;
  };

  if (method === "PATCH") {
    return match(/^\/api\/projects\/([^/]+)$/, "project-update")
      ?? match(/^\/api\/expenses\/([^/]+)$/, "expense-update")
      ?? match(/^\/api\/payments\/([^/]+)$/, "payment-update")
      ?? match(/^\/api\/tasks\/([^/]+)$/, "task-update")
      ?? match(/^\/api\/admin\/users\/([^/]+)$/, "user-access-update");
  }

  if (method === "DELETE") {
    return match(/^\/api\/expenses\/([^/]+)$/, "expense-delete")
      ?? match(/^\/api\/payments\/([^/]+)$/, "payment-delete")
      ?? match(/^\/api\/tasks\/([^/]+)$/, "task-delete")
      ?? match(/^\/api\/projects\/([^/]+)\/members\/([^/]+)$/, "project-member-remove", (groups) => `${groups[1]}_${groups[2]}`);
  }

  if (method === "POST") {
    return match(/^\/api\/expenses\/([^/]+)\/restore$/, "expense-restore")
      ?? match(/^\/api\/payments\/([^/]+)\/restore$/, "payment-restore")
      ?? match(/^\/api\/projects\/([^/]+)\/budget-adjustments$/, "budget-adjust")
      ?? match(/^\/api\/projects\/([^/]+)\/freeze$/, "project-freeze")
      ?? match(/^\/api\/projects\/([^/]+)\/resume$/, "project-resume")
      ?? match(/^\/api\/projects\/([^/]+)\/members$/, "project-member-add");
  }

  return null;
}

export function ConfirmationGuard() {
  const { t } = useTranslations();

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      const request = input instanceof Request ? input : null;
      const url = typeof input === "string" || input instanceof URL ? input.toString() : input.url;
      const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
      const headers = new Headers(init?.headers ?? request?.headers);
      const challenge = getChallenge(new URL(url, window.location.origin).pathname, method);

      if (!challenge || headers.has("X-Shinex-Confirmation-Code")) {
        return originalFetch(input, init);
      }

      const response = await originalFetch("/api/confirmation-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(challenge),
      });
      const payload = await response.json().catch(() => null) as { phrase?: string; error?: { message?: string } } | null;

      if (!response.ok || !payload?.phrase) {
        throw new Error(payload?.error?.message || t("confirmation.challengeFailed"));
      }

      const code = window.prompt(t("confirmation.prompt", { phrase: payload.phrase }))?.trim();
      if (!code) throw new Error(t("confirmation.cancelled"));

      headers.set("X-Shinex-Confirmation-Code", code);
      return originalFetch(input, { ...init, headers });
    };

    return () => { window.fetch = originalFetch; };
  }, [t]);

  return null;
}
