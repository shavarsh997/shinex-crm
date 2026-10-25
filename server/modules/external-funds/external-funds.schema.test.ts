import { describe, expect, it } from "vitest";
import { createExternalFundEntrySchema, updateExternalFundEntrySchema } from "./external-funds.schema";

const income = { type: "INCOME", amount: "500000", title: "На материалы", date: "2026-10-25", clientRequestId: "6dd80b2d-43e4-4f87-845c-60a1dd185855" };

describe("external fund validation", () => {
  it("preserves exact amounts and clears expense categories when changing to income", () => {
    expect(createExternalFundEntrySchema.parse({ ...income, amount: "9223372036854775807", category: "MATERIAL", counterparty: " Заказчик " })).toMatchObject({
      amount: 9_223_372_036_854_775_807n, category: null, counterparty: "Заказчик", notes: null,
    });
  });

  it.each(["0", "-1", "1.5", "", "abc", "9223372036854775808", true, null, 9007199254740992])("rejects invalid or imprecise money: %s", (amount) => {
    expect(createExternalFundEntrySchema.safeParse({ ...income, amount }).success).toBe(false);
  });

  it("requires an expense category and rejects salary entries without employee accounting", () => {
    expect(createExternalFundEntrySchema.safeParse({ ...income, type: "EXPENSE" }).success).toBe(false);
    expect(createExternalFundEntrySchema.safeParse({ ...income, type: "EXPENSE", category: "EMPLOYEE" }).success).toBe(false);
    expect(createExternalFundEntrySchema.parse({ ...income, type: "EXPENSE", category: "MATERIAL" }).category).toBe("MATERIAL");
  });

  it.each(["2026-02-30", "2026-13-01", "", null])("rejects invalid dates: %s", (date) => {
    expect(createExternalFundEntrySchema.safeParse({ ...income, date }).success).toBe(false);
  });

  it("clears optional fields on edit and cannot move an entry into another project", () => {
    const parsed = updateExternalFundEntrySchema.parse({ ...income, projectId: "other-project", notes: "  ", counterparty: "" });
    expect(parsed.notes).toBeNull();
    expect(parsed.counterparty).toBeNull();
    expect(parsed).not.toHaveProperty("projectId");
    expect(parsed).not.toHaveProperty("clientRequestId");
  });
});
