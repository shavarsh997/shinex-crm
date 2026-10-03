import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { values, cookieStore, requireUser, requireAdmin, complete, hardDelete, requestCompletion, requestDeletion } = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    cookieStore: {
      get: vi.fn((name: string) => values.has(name) ? { value: values.get(name) } : undefined),
      set: vi.fn((name: string, value: string) => { values.set(name, value); }),
      delete: vi.fn(({ name }: { name: string; path: string }) => { values.delete(name); }),
    },
    requireUser: vi.fn(), requireAdmin: vi.fn(),
    complete: vi.fn(), hardDelete: vi.fn(), requestCompletion: vi.fn(), requestDeletion: vi.fn(),
  };
});

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("@/server/auth", () => ({ requireUser, requireAdmin }));
vi.mock("@/server/modules/projects/projects.service", () => ({
  completeProjectForUser: complete, hardDeleteProjectForAdmin: hardDelete,
  requestProjectCompletion: requestCompletion, requestProjectHardDeletion: requestDeletion,
}));
vi.mock("@/server/shared/serializers/financial", () => ({ serializeProject: (project: unknown) => project }));

import { GET as completionChallenge } from "./[projectId]/completion-challenge/route";
import { GET as deletionChallenge } from "./[projectId]/hard-delete-challenge/route";
import { POST as completeProject } from "./[projectId]/complete/route";
import { POST as deleteProject } from "./[projectId]/hard-delete/route";

const context = { params: Promise.resolve({ projectId: "project-1" }) };
const request = (phrase?: unknown) => new Request("http://localhost/api/projects/project-1", phrase === undefined ? {} : {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phrase }),
});

beforeEach(() => {
  values.clear();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-03T12:00:00Z"));
  requireUser.mockResolvedValue({ id: "user-1", role: "ADMIN" });
  requireAdmin.mockResolvedValue({ id: "user-1", role: "ADMIN" });
  complete.mockResolvedValue({ id: "project-1" });
});
afterEach(() => { vi.useRealTimers(); });

describe.each([
  { flow: "completion", challenge: completionChallenge, submit: completeProject, mutation: complete },
  { flow: "hard deletion", challenge: deletionChallenge, submit: deleteProject, mutation: hardDelete },
])("project $flow confirmation", ({ challenge, submit, mutation }) => {
  it("issues three digits, performs the confirmed action and clears the cookie", async () => {
    const response = await challenge(request(), context);
    expect(response.status).toBe(200);
    const { phrase } = await response.json();
    expect(phrase).toMatch(/^[1-9][0-9]{2}$/);
    expect((await submit(request(phrase), context)).status).toBe(200);
    expect(mutation).toHaveBeenCalledOnce();
    expect(cookieStore.delete).toHaveBeenCalledWith(expect.objectContaining({ path: "/api/projects/project-1" }));
    expect((await submit(request(phrase), context)).status).toBe(400);
    expect(mutation).toHaveBeenCalledOnce();
  });

  it("rejects a wrong code and still accepts the correct code afterward", async () => {
    const { phrase } = await (await challenge(request(), context)).json();
    expect((await submit(request(phrase === "123" ? "456" : "123"), context)).status).toBe(400);
    expect(mutation).not.toHaveBeenCalled();
    expect((await submit(request(phrase), context)).status).toBe(200);
  });

  it("rejects a code after ten minutes even if its cookie is present", async () => {
    const { phrase } = await (await challenge(request(), context)).json();
    vi.advanceTimersByTime(600_000);
    expect((await submit(request(phrase), context)).status).toBe(400);
    expect(mutation).not.toHaveBeenCalled();
  });

  it("rejects another user's code", async () => {
    const { phrase } = await (await challenge(request(), context)).json();
    requireUser.mockResolvedValue({ id: "user-2", role: "ADMIN" });
    requireAdmin.mockResolvedValue({ id: "user-2", role: "ADMIN" });
    expect((await submit(request(phrase), context)).status).toBe(400);
    expect(mutation).not.toHaveBeenCalled();
  });

  it.each(["", "12", "1234", "abc", 123])("rejects an invalid code: %s", async (phrase) => {
    expect((await submit(request(phrase), context)).status).toBe(400);
    expect(mutation).not.toHaveBeenCalled();
  });
});

it("does not accept a completion code for permanent deletion", async () => {
  const { phrase } = await (await completionChallenge(request(), context)).json();
  expect((await deleteProject(request(phrase), context)).status).toBe(400);
  expect(hardDelete).not.toHaveBeenCalled();
});
