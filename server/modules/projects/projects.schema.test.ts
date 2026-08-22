import { describe, expect, it } from "vitest";

import { createProjectSchema, updateProjectSchema } from "./projects.schema";

describe("project schemas", () => {
  it("allows financial starting values only when creating a project", () => {
    const created = createProjectSchema.parse({
      title: "Тестовый проект",
      estimatedAmount: "100000",
      receivedAmount: "25000",
    });

    expect(created.estimatedAmount).toBe(100_000n);
    expect(created.receivedAmount).toBe(25_000n);
  });

  it("does not allow financial totals through the general update endpoint", () => {
    expect(updateProjectSchema.safeParse({ receivedAmount: "25000" }).success).toBe(false);
    expect(updateProjectSchema.safeParse({ estimatedAmount: "100000" }).success).toBe(false);
    expect(updateProjectSchema.parse({ title: "Новое название" })).toEqual({ title: "Новое название" });
  });
});
