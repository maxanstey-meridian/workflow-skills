import { describe, expect, test } from "vitest";
import { slotSummary } from "~/pages/index/logic/slot-summary";

describe("slotSummary", () => {
  const slot = { startsAt: "2026-11-24T14:00:00Z", endsAt: "2026-11-24T15:00:00Z" };

  test("names the room and the exact slot it will book", () => {
    const summary = slotSummary("Studio A", slot);
    expect(summary).toContain("Studio A");
    expect(summary).toContain("24 Nov 2026");
    expect(summary).toContain("14:00");
    expect(summary).toContain("15:00");
  });

  test("states the check-in consequence before the member commits", () => {
    const summary = slotSummary("Studio A", slot);
    expect(summary).toContain("15 minutes");
    expect(summary).toContain("released");
  });

  test("differs when another room or slot is picked", () => {
    const summary = slotSummary("Quiet Room", {
      startsAt: "2026-11-25T09:00:00Z",
      endsAt: "2026-11-25T10:30:00Z",
    });
    expect(summary).toContain("Quiet Room");
    expect(summary).toContain("25 Nov 2026");
    expect(summary).toContain("10:30");
  });
});
