import { describe, expect, it } from "vitest";
import { bookingTimes, statusLabel } from "~/pages/my-bookings/logic/booking-display";
import { checkInableBooking, windowClosedBooking } from "../../../support/fixtures";

describe("booking row display", () => {
  it("labels every status the read model can carry", () => {
    expect(statusLabel("booked")).toBe("Booked");
    expect(statusLabel("checkedIn")).toBe("Checked in");
    expect(statusLabel("cancelled")).toBe("Cancelled");
    expect(statusLabel("released")).toBe("Released");
  });

  it("shows the slot as day and time range", () => {
    expect(bookingTimes(checkInableBooking)).toBe("Mon 2 Nov 2026, 14:00–15:00");
    expect(bookingTimes(windowClosedBooking)).toBe("Mon 2 Nov 2026, 09:00–10:00");
  });
});
