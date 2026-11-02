// Times render on the user's clock; the booking zone (Europe/London) matches the
// dev browser, and the formatters are pinned to en-GB so the copy is stable.
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// en-GB's combined weekday format inserts a comma ("Mon, 2 Nov 2026"); the
// parts are joined by hand to keep the GOV.UK-style "Mon 2 Nov 2026".
const weekdayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const formatTime = (instant: string): string => timeFormat.format(new Date(instant));

export const formatDay = (instant: string): string => {
  const date = new Date(instant);
  return `${weekdayFormat.format(date)} ${dateFormat.format(date)}`;
};

export const formatInterval = (startInstant: string, endInstant: string): string =>
  `${formatTime(startInstant)}–${formatTime(endInstant)}`;

/** A local calendar day ("YYYY-MM-DD"), the shape the availability endpoint takes. */
export const toIsoDateKey = (day: Date): string => {
  const year = String(day.getFullYear()).padStart(4, "0");
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
};

export const todayIsoKey = (now: Date): string => toIsoDateKey(now);

/** Composes the picked day and time into the UTC instant the API expects. */
export const toBookingInstant = (dateKey: string, time: string): string | null => {
  const instant = new Date(`${dateKey}T${time}`);
  if (Number.isNaN(instant.getTime())) {
    return null;
  }
  return instant.toISOString();
};
