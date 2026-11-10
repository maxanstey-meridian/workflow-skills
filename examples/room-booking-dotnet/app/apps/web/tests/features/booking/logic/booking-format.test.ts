import { describe, expect, it } from "vitest";
import {
  statusLabel,
  formatTime,
  formatDay,
  slotTimes,
  slotInstant,
  addMinutes,
  actionEnabled,
} from "../../../../app/features/booking/logic/booking-format";
import type { BookingResponse, BookingActionResponse } from "../../../../app/shared/api-types";

describe("statusLabel", () => {
  it.each([
    ["Booked", "Upcoming"],
    ["CheckedIn", "Checked in"],
    ["Cancelled", "Cancelled"],
    ["Released", "Released"],
  ])("says %s in the space's words", (status, expected) => {
    expect(statusLabel(status)).toBe(expected);
  });
});

describe("formatTime", () => {
  it("shows the UTC clock time the booking holds", () => {
    expect(formatTime("2026-11-11T09:30:00Z")).toBe("09:30");
  });

  it("does not drift with the viewer's time zone", () => {
    expect(formatTime("2026-11-11T23:45:00Z")).toBe("23:45");
  });
});

describe("formatDay", () => {
  it("shows the UTC day the booking holds", () => {
    expect(formatDay("2026-11-11T09:30:00Z")).toBe("Wed 11 Nov");
  });
});

describe("slotTimes", () => {
  it("offers half-hour slots across the working day", () => {
    const slots = slotTimes();
    expect(slots[0]).toBe("07:00");
    expect(slots).toContain("12:30");
    expect(slots.at(-1)).toBe("20:30");
  });
});

describe("slotInstant and addMinutes", () => {
  it("builds the booked instant and its end", () => {
    const startsAt = slotInstant("2026-11-11", "09:30");
    expect(startsAt).toBe("2026-11-11T09:30:00.000Z");
    expect(addMinutes(startsAt, 90)).toBe("2026-11-11T11:00:00.000Z");
  });
});

const action = (overrides: Partial<BookingActionResponse>): BookingActionResponse => ({
  action: "cancel",
  enabled: false,
  reason: null,
  ...overrides,
});

const booking = (actions: BookingActionResponse[]): BookingResponse => ({
  id: "9b9d2b78-85a3-4d10-93e6-1e34dbba6d01",
  roomId: "8a9d2b78-85a3-4d10-93e6-1e34dbba6d02",
  roomName: "Focus Room",
  startsAt: "2026-11-11T09:00:00Z",
  endsAt: "2026-11-11T10:00:00Z",
  status: "Booked",
  availableActions: actions,
});

describe("actionEnabled", () => {
  it("follows the server's answer, not a re-derived rule", () => {
    const checkIn = booking([action({ action: "check-in", enabled: false, reason: "too early" })]);
    expect(actionEnabled(checkIn, "check-in")).toBe(false);

    const cancellable = booking([action({ action: "cancel", enabled: true })]);
    expect(actionEnabled(cancellable, "cancel")).toBe(true);
  });

  it("treats an action the server did not mention as closed", () => {
    const empty = booking([]);
    expect(actionEnabled(empty, "check-in")).toBe(false);
  });
});
