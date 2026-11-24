import { describe, expect, test } from "vitest";
import { buildSlot, durations, startTimes, todayIso } from "~/pages/index/logic/slot";

describe("buildSlot", () => {
  test("builds ISO instants from the picked date, start time, and duration", () => {
    expect(buildSlot("2026-11-24", "14:00", 60)).toEqual({
      startsAt: "2026-11-24T14:00:00.000Z",
      endsAt: "2026-11-24T15:00:00.000Z",
    });
  });

  test("builds a 90-minute slot ending later the same day", () => {
    expect(buildSlot("2026-11-24", "14:00", 90)).toEqual({
      startsAt: "2026-11-24T14:00:00.000Z",
      endsAt: "2026-11-24T15:30:00.000Z",
    });
  });

  test("builds a slot that ends the next day", () => {
    expect(buildSlot("2026-11-24", "23:30", 60)).toEqual({
      startsAt: "2026-11-24T23:30:00.000Z",
      endsAt: "2026-11-25T00:30:00.000Z",
    });
  });

  test("is null while the start time is not picked", () => {
    expect(buildSlot("2026-11-24", "", 60)).toBeNull();
  });

  test("is null for a date the control could never produce a slot from", () => {
    expect(buildSlot("not-a-date", "14:00", 60)).toBeNull();
  });
});

describe("todayIso", () => {
  test("shows the local calendar date of the given moment", () => {
    expect(todayIso(new Date("2026-11-24T23:30:00Z"))).toBe("2026-11-24");
  });

  test("rolls over to the next day after midnight", () => {
    expect(todayIso(new Date("2026-01-01T00:30:00Z"))).toBe("2026-01-01");
  });
});

describe("startTimes", () => {
  test("starts early in the morning and ends late in the evening, in half-hour steps", () => {
    expect(startTimes[0]).toBe("06:00");
    expect(startTimes[startTimes.length - 1]).toBe("21:30");
    expect(startTimes).toContain("14:00");
    expect(startTimes).toContain("14:30");
    expect(startTimes).not.toContain("14:15");
  });

  test("is strictly increasing", () => {
    const sorted = [...startTimes].sort();
    expect(startTimes).toEqual(sorted);
  });
});

describe("durations", () => {
  test("offers the half-hour multiples the app promises", () => {
    expect(durations).toEqual([30, 60, 90, 120]);
  });
});
