import { describe, expect, test } from "vitest";
import { actionLabel, statusColor, statusLabel } from "~/features/booking";

describe("statusLabel", () => {
  test("says each booking status in plain words", () => {
    expect(statusLabel("booked")).toBe("Booked");
    expect(statusLabel("checkedIn")).toBe("Checked in");
    expect(statusLabel("cancelled")).toBe("Cancelled");
    expect(statusLabel("released")).toBe("Released (no check-in)");
  });
});

describe("actionLabel", () => {
  test("labels the actions the server can offer", () => {
    expect(actionLabel("cancel")).toBe("Cancel booking");
    expect(actionLabel("checkIn")).toBe("Check in");
  });
});

describe("statusColor", () => {
  test("marks live bookings and settled bookings differently", () => {
    expect(statusColor("booked")).toBe("primary");
    expect(statusColor("checkedIn")).toBe("success");
    expect(statusColor("cancelled")).toBe("neutral");
    expect(statusColor("released")).toBe("neutral");
  });
});
