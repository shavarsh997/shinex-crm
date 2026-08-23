export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // Vercel serverless isolates exit after the request. Blocking cold starts on
  // Telegram API calls makes the Mini App look broken; the first production
  // page view schedules the same sync with after() instead.
  if (process.env.VERCEL) {
    return;
  }

  const { registerTelegramIntegration } = await import("./server/modules/telegram/telegram.service");
  await registerTelegramIntegration();
}
