import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookies, sessionCreate, sessionDeleteMany, transaction } = vi.hoisted(() => {
  const sessionCreate = vi.fn();
  const sessionDeleteMany = vi.fn();
  const transaction = vi.fn(async (callback: (client: { session: { create: typeof sessionCreate; deleteMany: typeof sessionDeleteMany } }) => unknown) => {
    await callback({ session: { create: sessionCreate, deleteMany: sessionDeleteMany } });
  });
  const cookies = vi.fn();

  return { cookies, sessionCreate, sessionDeleteMany, transaction };
});

vi.mock("next/headers", () => ({ cookies }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { $transaction: transaction } }));

import { createSession } from "./service";

describe("createSession", () => {
  beforeEach(() => {
    sessionCreate.mockReset();
    sessionDeleteMany.mockReset();
    transaction.mockClear();
    cookies.mockReturnValue({ set: vi.fn() });
  });

  it("keeps existing sessions when the same user signs in on another device", async () => {
    await createSession("user-1");
    await createSession("user-1");

    expect(sessionCreate).toHaveBeenCalledTimes(2);
    expect(sessionDeleteMany).toHaveBeenCalledTimes(2);
    expect(sessionDeleteMany).toHaveBeenCalledWith({ where: { expires: { lte: expect.any(Date) } } });
    expect(sessionDeleteMany.mock.calls).not.toContainEqual([{ where: { userId: "user-1" } }]);
  });
});
