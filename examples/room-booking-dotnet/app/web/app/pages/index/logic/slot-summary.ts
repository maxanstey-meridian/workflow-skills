import { formatDate, formatTime } from "~/features/booking";
import type { TimeSlot } from "~/features/rooms";

/** States exactly what will happen when the member confirms this slot. */
export const slotSummary = (roomName: string, slot: TimeSlot): string =>
  `You'll book ${roomName} on ${formatDate(slot.startsAt)} from ${formatTime(
    slot.startsAt,
  )} to ${formatTime(slot.endsAt)}. Check in when it starts — if you don't check in within 15 minutes of the start, the booking is released and the slot frees up for others.`;
