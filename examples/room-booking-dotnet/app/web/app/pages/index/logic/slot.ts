import type { TimeSlot } from "~/features/rooms";

export const durations: readonly number[] = [30, 60, 90, 120];

const firstStartMinutes = 6 * 60;
const lastStartMinutes = 21 * 60 + 30;
const stepMinutes = 30;

const clockLabel = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};

export const startTimes: string[] = Array.from(
  { length: (lastStartMinutes - firstStartMinutes) / stepMinutes + 1 },
  (_, index) => clockLabel(firstStartMinutes + index * stepMinutes),
);

/** The local calendar date as `YYYY-MM-DD`, the value a date input holds. */
export const todayIso = (now: Date = new Date()): string => {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * The exact slot the picked controls describe, as ISO 8601 instants. Returns
 * null while the controls do not yet describe a slot (missing or empty parts).
 */
export const buildSlot = (
  dateIso: string,
  startTime: string,
  durationMinutes: number,
): TimeSlot | null => {
  const startsAt = new Date(`${dateIso}T${startTime}:00`);
  if (Number.isNaN(startsAt.getTime())) {
    return null;
  }
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
};
