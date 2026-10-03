import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { values, cookieStore } = vi.hoisted(() => {
  const values = new Map<string, string>();
  const cookieStore = {
    get: vi.fn((name: string) => values.has(name) ? { value: values.get(name) } : undefined),
    set: vi.fn((name: string, value: string) => { values.set(name, value); }),
    delete: vi.fn(({ name }: { name: string; path: string }) => { values.delete(name); }),
  };
  return { values, cookieStore };
});

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

import { confirmationActions, confirmationCookieName, issueConfirmationChallenge, requireConfirmation } from "./confirmation";

const request = (code?: string) => new Request("http://localhost/api/projects/project-1", {
  headers: code === undefined ? {} : { "X-Shinex-Confirmation-Code": code },
});

beforeEach(() => {
  values.clear();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-03T12:00:00Z"));
});

afterEach(() => { vi.useRealTimers(); });

describe("action confirmation", () => {
  it.each(confirmationActions)("issues exactly three digits for %s", async (action) => {
    const code = await issueConfirmationChallenge("user-1", action, "project-1");
    expect(code).toMatch(/^[1-9][0-9]{2}$/);
    expect(cookieStore.set).toHaveBeenCalledWith(
      confirmationCookieName(action, "project-1"), expect.any(String),
      expect.objectContaining({ httpOnly: true, path: "/api", maxAge: 600 }),
    );
  });

  it("accepts the matching code and clears the challenge", async () => {
    const code = await issueConfirmationChallenge("user-1", "project-update", "project-1");
    await requireConfirmation(request(` ${code} `), "user-1", "project-update", "project-1");
    expect(cookieStore.delete).toHaveBeenCalledWith({ name: confirmationCookieName("project-update", "project-1"), path: "/api" });
    await expect(requireConfirmation(request(code), "user-1", "project-update", "project-1")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it.each([undefined, "", "12", "1234", "abc", "000"])("rejects an invalid code %s without consuming the challenge", async (invalid) => {
    const code = await issueConfirmationChallenge("user-1", "project-update", "project-1");
    await expect(requireConfirmation(request(invalid), "user-1", "project-update", "project-1")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(requireConfirmation(request(code), "user-1", "project-update", "project-1")).resolves.toBeUndefined();
  });

  it("rejects a different three-digit code", async () => {
    const code = await issueConfirmationChallenge("user-1", "project-update", "project-1");
    const wrongCode = code === "123" ? "456" : "123";
    await expect(requireConfirmation(request(wrongCode), "user-1", "project-update", "project-1")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("binds confirmation to its user, action and resource", async () => {
    const code = await issueConfirmationChallenge("user-1", "project-update", "project-1");
    for (const [user, action, resource] of [
      ["user-2", "project-update", "project-1"],
      ["user-1", "project-freeze", "project-1"],
      ["user-1", "project-update", "project-2"],
    ] as const) {
      await expect(requireConfirmation(request(code), user, action, resource)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });

  it("rejects expired challenges even when the browser still sends the cookie", async () => {
    const code = await issueConfirmationChallenge("user-1", "project-update", "project-1");
    vi.advanceTimersByTime(600_000);
    await expect(requireConfirmation(request(code), "user-1", "project-update", "project-1")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it.each(["broken json", "null", "[]", '{"phrase":"123","userId":"user-1"}'])("rejects malformed or legacy cookies: %s", async (value) => {
    values.set(confirmationCookieName("project-update", "project-1"), value);
    await expect(requireConfirmation(request("123"), "user-1", "project-update", "project-1")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
