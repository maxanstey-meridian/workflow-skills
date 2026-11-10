import type { BookingResponse, BookingActionResponse } from "../../../shared/api-types";

/** A booking's status in words the space uses, not the enum's spelling. */
export const statusLabel = (status: string): string =>
  status === "Booked"
    ? "Upcoming"
    : status === "CheckedIn"
      ? "Checked in"
      : status === "Cancelled"
        ? "Cancelled"
        : status === "Released"
          ? "Released"
          : status;

/** HH:mm in UTC — the instant the booking holds, labelled so it cannot be misread. */
export const formatTime = (iso: string): string => {
  const time = new Date(iso);
  const hh = String(time.getUTCHours()).padStart(2, "0");
  const mm = String(time.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

/** Weekday and day, e.g. "Wed 11 Nov", in UTC so it matches the time shown beside it. */
export const formatDay = (iso: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(iso));

/** The start times a member can pick: half hours from 07:00 to 20:30 UTC. */
export const slotTimes = (startHour = 7, endHour = 21): string[] => {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
    slots.push(`${String(hour).padStart(2, "0")}:30`);
  }
  return slots;
};

export const durations = [30, 60, 90, 120];

/** A UTC instant for a date and an HH:mm slot time. */
export const slotInstant = (date: string, time: string): string => `${date}T${time}:00.000Z`;

/** The instant one slot's duration later. */
export const addMinutes = (instant: string, minutes: number): string =>
  new Date(new Date(instant).getTime() + minutes * 60_000).toISOString();

/** A member-facing line for a disabled action's reason. */
export const actionHint = (action: BookingActionResponse): string | undefined =>
  action.enabled ? undefined : (action.reason ?? undefined);

export const actionEnabled = (booking: BookingResponse, action: string): boolean =>
  booking.availableActions.find(candidate => candidate.action === action)?.enabled ?? false;
