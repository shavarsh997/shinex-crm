import { describe, expect, it } from "vitest";

import { updatePaymentSchema } from "./payments.schema";

describe("payment update schema", () => {
  it("allows clearing an optional note while preserving exact money values", () => {
    const payment = updatePaymentSchema.parse({ amount: "9223372036854775807", notes: "" });

    expect(payment.amount).toBe(9_223_372_036_854_775_807n);
    expect(payment.notes).toBeNull();
  });
});
