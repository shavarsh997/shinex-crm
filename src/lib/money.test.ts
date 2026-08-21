import { describe, expect, it } from "vitest";

import { parseMoneyInput } from "./money";

describe("parseMoneyInput", () => {
  it("preserves exact values beyond JavaScript's safe integer range", () => {
    expect(parseMoneyInput("9 223 372 036 854 775")).toBe(9_223_372_036_854_775n);
  });

  it("rejects decimal, negative, and non-numeric input", () => {
    expect(parseMoneyInput("1.5")).toBeNull();
    expect(parseMoneyInput("-1")).toBeNull();
    expect(parseMoneyInput("AMD 100")).toBeNull();
  });
});
