import { formatTime } from "./clock";

/**
 * The consequence of checking in late, from the deadline the server sends
 * (`checkInClosesAt`). The server decides whether check-in is still open; this
 * only explains the deadline.
 */
export const checkInCopy = (checkInClosesAt: string | null): string | null => {
  if (checkInClosesAt === null) {
    return null;
  }
  return `Check in by ${formatTime(checkInClosesAt)} or the room is released.`;
};
