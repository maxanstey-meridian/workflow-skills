import { describe, expect, it } from "vitest";
import { slotIsoRange, slotStartChoices } from "../pages/index/logic/slot-options";
import { actionPresentation, formatSlot, statusPresentation } from "./booking-presentation";

describe("statusPresentation", () => {
  it("labels each server status without inventing rules", () => {
    expect(statusPresentation("booked").label).toBe("Upcoming");
    expect(statusPresentation("checked-in").label).toBe("Checked in");
    expect(statusPresentation("cancelled").label).toBe("Cancelled");
    expect(statusPresentation("released").label).toBe("Released (not checked in)");
  });
});

describe("actionPresentation", () => {
  it("explains the consequence of each available action", () => {
    expect(actionPresentation("check-in").description).toContain("arrival");
    expect(actionPresentation("cancel").description).toContain("bookable by other members");
  });
});

describe("slot options", () => {
  it("starts the searchable day at 06:00 and ends before midnight", () => {
    const choices = slotStartChoices();
    expect(choices[0]?.label).toBe("06:00");
    expect(choices.at(-1)?.label).toBe("21:30");
  });

  it("reads the day input as local time and sends UTC instants", () => {
    // Tests run with TZ=UTC, so the local day input parses as UTC direct instants.
    const { startUtc, endUtc } = slotIsoRange("2026-11-10", 7 * 60 + 30, 60);
    expect(new Date(startUtc).toISOString()).toBe("2026-11-10T07:30:00.000Z");
    expect(new Date(endUtc).toISOString()).toBe("2026-11-10T08:30:00.000Z");
  });
});

describe("formatSlot", () => {
  it("shows the local day and times of a slot", () => {
    const text = formatSlot("2026-11-10T09:00:00.000Z", "2026-11-10T10:30:00.000Z");
    expect(text).toContain("09:00");
    expect(text).toContain("10:30");
    expect(text).toContain("10");
  });
});
