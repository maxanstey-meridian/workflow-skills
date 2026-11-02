import { describe, expect, it } from "vitest";
import {
  formatDay,
  formatInterval,
  formatTime,
  toBookingInstant,
  toIsoDateKey,
  todayIsoKey,
} from "~/shared/logic/clock";

describe("clock formatting", () => {
  it("renders an instant as a 24-hour local time", () => {
    expect(formatTime("2026-11-02T14:15:00Z")).toBe("14:15");
  });

  it("renders midnight without a 24 o'clock", () => {
    expect(formatTime("2026-11-02T00:00:00Z")).toBe("00:00");
  });

  it("renders a day for a list row", () => {
    expect(formatDay("2026-11-02T14:00:00Z")).toBe("Mon 2 Nov 2026");
  });

  it("joins two instants into an interval", () => {
    expect(formatInterval("2026-11-02T14:00:00Z", "2026-11-02T15:30:00Z")).toBe("14:00–15:30");
  });

  it("writes the local calendar day", () => {
    expect(toIsoDateKey(new Date(2026, 10, 2))).toBe("2026-11-02");
  });

  it("defaults the picker to the day it is given", () => {
    expect(todayIsoKey(new Date(2026, 10, 2, 9, 30))).toBe("2026-11-02");
  });

  it("composes the picked day and time into the UTC instant the API expects", () => {
    expect(toBookingInstant("2026-11-02", "14:00")).toBe("2026-11-02T14:00:00.000Z");
    expect(toBookingInstant("2026-11-02", "14:00")).not.toBe("2026-11-02T15:00:00.000Z");
  });

  it("refuses an incomplete day and time instead of throwing", () => {
    expect(toBookingInstant("", "")).toBeNull();
  });
});
