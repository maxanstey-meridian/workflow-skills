import { describe, expect, test } from "vitest";
import { actionOutcome } from "~/pages/bookings/logic/action-outcome";

describe("actionOutcome", () => {
  test("says a cancellation freed the slot", () => {
    const message = actionOutcome({ kind: "done", status: "cancelled" });
    expect(message).toContain("cancelled");
    expect(message).toContain("free for others");
  });

  test("says a check-in succeeded", () => {
    expect(actionOutcome({ kind: "done", status: "checkedIn" })).toContain("checked in");
  });

  test("points a signed-out member to the header", () => {
    expect(actionOutcome({ kind: "signedOut" })).toContain("header");
  });

  test("points a wrong-role persona at the member who made the booking", () => {
    expect(actionOutcome({ kind: "forbidden" })).toContain("member");
  });

  test("passes the server's failure message through", () => {
    expect(
      actionOutcome({ kind: "failed", message: "Check-in opens when the booking starts." }),
    ).toBe("Check-in opens when the booking starts.");
  });
});
