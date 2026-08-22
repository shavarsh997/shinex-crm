import { describe, expect, it } from "vitest";

import { createExpenseSchema, updateExpenseSchema } from "./expenses.schema";

const clientRequestId = "b65b3ed0-ded3-4fac-85f0-4e0ea8e1b990";

describe("expense schemas", () => {
  it("requires a stable retry key and employee name for a new salary", () => {
    expect(createExpenseSchema.safeParse({ type: "EMPLOYEE", title: "Зарплата", amount: "1000", date: "2026-08-22", clientRequestId }).success).toBe(false);
    expect(createExpenseSchema.safeParse({ type: "EMPLOYEE", title: "Зарплата", amount: "1000", date: "2026-08-22", employeeName: "Арман", clientRequestId }).success).toBe(true);
  });

  it("turns intentionally cleared optional fields into database null values", () => {
    expect(updateExpenseSchema.parse({ type: "MATERIAL", employeeName: "", vendorName: "" })).toMatchObject({ employeeName: null, vendorName: null });
  });
});
