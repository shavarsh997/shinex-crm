import { describe, expect, it } from "vitest";

import { isTelegramStartCommand } from "./telegram.commands";

describe("Telegram commands", () => {
  it("recognizes /start with optional bot username and payload", () => {
    expect(isTelegramStartCommand("/start")).toBe(true);
    expect(isTelegramStartCommand("/start@shinex_bot invite")).toBe(true);
  });

  it("does not treat other messages as /start", () => {
    expect(isTelegramStartCommand("/starter")).toBe(false);
    expect(isTelegramStartCommand("start")).toBe(false);
  });
});
