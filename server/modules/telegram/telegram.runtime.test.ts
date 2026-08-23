import { afterEach, describe, expect, it, vi } from "vitest";

import { shouldAutoSynchronizeTelegramIntegration } from "./telegram.runtime";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("shouldAutoSynchronizeTelegramIntegration", () => {
  it("skips Vercel preview deployments so they cannot steal the production bot", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");

    expect(shouldAutoSynchronizeTelegramIntegration()).toBe(false);
  });

  it("runs on Vercel production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NODE_ENV", "production");

    expect(shouldAutoSynchronizeTelegramIntegration()).toBe(true);
  });

  it("skips local next dev even if Telegram env vars are present", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "development");

    expect(shouldAutoSynchronizeTelegramIntegration()).toBe(false);
  });
});
