const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatDate = (iso: string): string => dateFormatter.format(new Date(iso));

export const formatTime = (iso: string): string => timeFormatter.format(new Date(iso));

export const formatSlotRange = (startsAt: string, endsAt: string): string =>
  `${formatDate(startsAt)}, ${formatTime(startsAt)}–${formatTime(endsAt)}`;
