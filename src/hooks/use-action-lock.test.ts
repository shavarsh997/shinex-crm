// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useActionLock } from "./use-action-lock";

afterEach(cleanup);

describe("useActionLock", () => {
  it("rejects same-tick duplicate actions without waiting for a render", () => {
    const { result, rerender } = renderHook(() => useActionLock());
    expect(result.current.acquire()).toBe(true);
    expect(result.current.acquire()).toBe(false);
    rerender();
    expect(result.current.isLocked()).toBe(true);
    expect(result.current.acquire()).toBe(false);
  });

  it("can start a new action after success, failure or cancellation releases the lock", () => {
    const { result } = renderHook(() => useActionLock());
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(result.current.acquire()).toBe(true);
      result.current.release();
      expect(result.current.isLocked()).toBe(false);
    }
  });
});
