import { describe, expect, it } from "vitest";
import { busyRows } from "~/pages/index/logic/availability";

describe("busy rows for the room cards", () => {
  it("sorts the day's held blocks by start and formats them", () => {
    const rows = busyRows([
      { start: "2026-11-02T11:00:00Z", end: "2026-11-02T12:00:00Z" },
      { start: "2026-11-02T09:00:00Z", end: "2026-11-02T10:30:00Z" },
    ]);
    expect(rows).toEqual([
      {
        startInstant: "2026-11-02T09:00:00Z",
        endInstant: "2026-11-02T10:30:00Z",
        label: "09:00–10:30",
      },
      {
        startInstant: "2026-11-02T11:00:00Z",
        endInstant: "2026-11-02T12:00:00Z",
        label: "11:00–12:00",
      },
    ]);
  });

  it("shows a free day as no blocks", () => {
    expect(busyRows([])).toEqual([]);
  });
});
