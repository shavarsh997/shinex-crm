import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { confirmationHeaders, requestConfirmationCode } from "./confirmation";

const fetchMock = vi.fn();
const promptMock = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", { prompt: promptMock });
  fetchMock.mockResolvedValue(Response.json({ phrase: "123" }));
});
afterEach(() => { vi.unstubAllGlobals(); });

const getCode = () => requestConfirmationCode("project-update", "project-1", (code) => `Enter ${code}`);

describe("requestConfirmationCode", () => {
  it("returns the retyped three-digit code as a valid HTTP header", async () => {
    promptMock.mockReturnValue(" 123 ");
    const code = await getCode();
    expect(code).toBe("123");
    expect(promptMock).toHaveBeenCalledWith("Enter 123");
    expect(new Headers(confirmationHeaders(code!)).get("X-Shinex-Confirmation-Code")).toBe("123");
  });

  it.each([null, "", "   "])("returns null when confirmation is cancelled: %s", async (value) => {
    promptMock.mockReturnValue(value);
    expect(await getCode()).toBeNull();
  });

  it.each(["456", "12", "1234", "МАЯК", "12a"])("rejects an incorrect code before a mutation can be sent: %s", async (value) => {
    promptMock.mockReturnValue(value);
    await expect(getCode()).rejects.toThrow("Код подтверждения не совпадает.");
  });

  it("does not prompt when the challenge request fails", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: { message: "Нет доступа" } }, { status: 403 }));
    await expect(getCode()).rejects.toThrow("Нет доступа");
    expect(promptMock).not.toHaveBeenCalled();
  });

  it.each(["МАЯК-123", "12", "1234", 123, null])("rejects a malformed challenge: %s", async (phrase) => {
    fetchMock.mockResolvedValue(Response.json({ phrase }));
    await expect(getCode()).rejects.toThrow("Не удалось подготовить код подтверждения.");
    expect(promptMock).not.toHaveBeenCalled();
  });
});
