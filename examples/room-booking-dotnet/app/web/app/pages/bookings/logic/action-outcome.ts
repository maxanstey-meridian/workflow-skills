import type { BookingActionResult, BookingStatus } from "~/features/booking";

/** What checking in or cancelling ended up doing, in plain words. */
const doneMessages: Readonly<Record<BookingStatus, string>> = {
  booked: "The booking is confirmed.",
  checkedIn: "You are checked in. Enjoy your session.",
  cancelled: "The booking is cancelled — the slot is free for others again.",
  released: "The booking was released because no one checked in.",
};

export const actionOutcome = (result: BookingActionResult): string => {
  switch (result.kind) {
    case "done":
      return doneMessages[result.status];
    case "signedOut":
      return "You are signed out. Pick who you are in the header, then try again.";
    case "forbidden":
      return "That booking belongs to another member. Switch to the member who made it, then try again.";
    case "failed":
      return result.message;
  }
};
