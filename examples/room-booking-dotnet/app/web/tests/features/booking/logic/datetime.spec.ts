import { describe, expect, test } from "vitest";
import { formatDate, formatSlotRange, formatTime } from "~/features/booking";

describe("formatDate", () => {
  test("shows the day, short month, and year", () => {
    expect(formatDate("2026-11-24T14:00:00Z")).toBe("24 Nov 2026");
  });

  test("does not pad single-digit days", () => {
    expect(formatDate("2026-01-05T09:05:00Z")).toBe("5 Jan 2026");
  });
});

describe("formatTime", () => {
  test("shows a 24-hour clock time", () => {
    expect(formatTime("2026-11-24T14:00:00Z")).toBe("14:00");
  });

  test("pads minutes and hours before ten", () => {
    expect(formatTime("2026-11-24T09:05:00Z")).toBe("09:05");
  });

  test("shows midnight as 00:00", () => {
    expect(formatTime("2026-11-24T00:30:00Z")).toBe("00:30");
  });
});

describe("formatSlotRange", () => {
  test("shows the date once and both times, including across midnight", () => {
    expect(formatSlotRange("2026-11-24T23:30:00Z", "2026-11-25T00:30:00Z")).toBe(
      "24 Nov 2026, 23:30–00:30",
    );
  });
});
