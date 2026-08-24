import { describe, expect, it } from "vitest";

import { getUserAvatarGradient, getUserInitials } from "./user-avatar";

describe("user avatar", () => {
  it("assigns the same color to the same user", () => {
    expect(getUserAvatarGradient("user-42")).toBe(getUserAvatarGradient("user-42"));
  });

  it("creates readable initials from a name or email", () => {
    expect(getUserInitials("Shavarsh Papoian")).toBe("SP");
    expect(getUserInitials("shavarsh@example.com")).toBe("SH");
  });
});
