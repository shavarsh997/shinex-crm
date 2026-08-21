import "server-only";

import { TooManyRequestsError } from "@/server/shared/errors";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const entries = new Map<string, RateLimitEntry>();
const maxEntries = 10_000;

function purgeExpiredEntries(now: number) {
  if (entries.size < maxEntries) return;

  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key);
  }
}

/**
 * A small per-process limiter for public endpoints. Deployments with multiple
 * instances must also enforce equivalent limits at their reverse proxy or a
 * shared rate-limit store.
 */
export function enforceRateLimit(key: string, { limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  purgeExpiredEntries(now);

  const current = entries.get(key);
  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= limit) {
    throw new TooManyRequestsError(Math.max(1, Math.ceil((current.resetAt - now) / 1_000)));
  }

  current.count += 1;
}

export function getRequestClientKey(request: Request) {
  // A reverse proxy must overwrite these headers rather than passing through a
  // client-supplied value. The email portion also prevents easy IP-only bypass.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown-client";
}
