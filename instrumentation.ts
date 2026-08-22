export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { registerTelegramWebhook } = await import("./server/modules/telegram/telegram.service");
  await registerTelegramWebhook();
}
