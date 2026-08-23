/**
 * Preview deployments and local `next dev` must not overwrite the production
 * bot's menu button or webhook. Vercel Preview builds use NODE_ENV=production.
 */
export function shouldAutoSynchronizeTelegramIntegration() {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === "production";
  }

  return process.env.NODE_ENV === "production";
}
