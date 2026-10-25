import { describe, expect, it } from "vitest";
import { summarizeExternalFunds } from "./external-funds";

describe("external funds balance", () => {
  it("counts only active entries and keeps exact sums above Number.MAX_SAFE_INTEGER", () => {
    expect(summarizeExternalFunds([
      { type: "INCOME", amount: 9_223_372_036_854_775_807n, deletedAt: null },
      { type: "INCOME", amount: 10n, deletedAt: null },
      { type: "EXPENSE", amount: 3n, deletedAt: null },
      { type: "INCOME", amount: 100n, deletedAt: new Date() },
      { type: "EXPENSE", amount: 500n, deletedAt: new Date() },
    ])).toEqual({ received: 9_223_372_036_854_775_817n, spent: 3n, balance: 9_223_372_036_854_775_814n });
  });

  it("shows an actual shortfall when purchases precede funding", () => {
    expect(summarizeExternalFunds([{ type: "EXPENSE", amount: 300n, deletedAt: null }])).toEqual({ received: 0n, spent: 300n, balance: -300n });
    expect(summarizeExternalFunds([])).toEqual({ received: 0n, spent: 0n, balance: 0n });
  });
});
