import type { components } from "@roombooking/contracts";
import { formatDay, formatInterval } from "~/shared/logic/clock";

type BookingDto = components["schemas"]["BookingDto"];
type BookingStatus = components["schemas"]["BookingStatus"];

/** Labels for the read model's status — presentation only. */
const statusLabels: Record<BookingStatus, string> = {
  booked: "Booked",
  checkedIn: "Checked in",
  cancelled: "Cancelled",
  released: "Released",
};

export const statusLabel = (status: BookingStatus): string => statusLabels[status];

export const bookingTimes = (booking: BookingDto): string =>
  `${formatDay(booking.start)}, ${formatInterval(booking.start, booking.end)}`;
