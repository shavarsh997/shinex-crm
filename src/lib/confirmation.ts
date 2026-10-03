export const confirmationActions = [
  "project-update",
  "project-freeze",
  "project-resume",
  "project-member-add",
  "project-member-remove",
  "budget-adjust",
  "expense-update",
  "expense-delete",
  "expense-restore",
  "payment-update",
  "payment-delete",
  "payment-restore",
  "task-update",
  "task-delete",
  "user-access-update",
] as const;

export type ConfirmationAction = (typeof confirmationActions)[number];

export function isConfirmationCode(value: unknown): value is string {
  return typeof value === "string" && /^[1-9][0-9]{2}$/.test(value);
}

export function confirmationHeaders(code: string) {
  return { "X-Shinex-Confirmation-Code": code };
}

export async function requestConfirmationChallenge(
  action: ConfirmationAction,
  resourceId: string,
) {
  const response = await fetch("/api/confirmation-challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, resourceId }),
  });
  const payload = await response.json().catch(() => null) as { phrase?: string; error?: { message?: string } } | null;

  if (!response.ok || !isConfirmationCode(payload?.phrase)) {
    throw new Error(payload?.error?.message || "Не удалось подготовить код подтверждения.");
  }

  return payload.phrase;
}

export async function requestConfirmationCode(
  action: ConfirmationAction,
  resourceId: string,
  prompt: (phrase: string) => string,
) {
  const phrase = await requestConfirmationChallenge(action, resourceId);
  const code = window.prompt(prompt(phrase))?.trim() || null;
  if (code && code !== phrase) {
    throw new Error("Код подтверждения не совпадает.");
  }
  return code;
}
