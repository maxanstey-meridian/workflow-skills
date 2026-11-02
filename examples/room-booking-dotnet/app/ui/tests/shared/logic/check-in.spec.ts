import { describe, expect, it } from "vitest";
import { checkInCopy } from "~/shared/logic/check-in";

describe("check-in consequence copy", () => {
  it("states the deadline and the consequence", () => {
    expect(checkInCopy("2026-11-02T14:15:00Z")).toBe("Check in by 14:15 or the room is released.");
  });

  it("stays silent when the server sends no deadline", () => {
    expect(checkInCopy(null)).toBeNull();
  });
});
