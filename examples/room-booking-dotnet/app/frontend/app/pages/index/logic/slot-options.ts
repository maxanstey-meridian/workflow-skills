// Pure helper: the slot options the booking page offers. The server accepts
// any start/end pair, so these are presentation choices, not a copied rule.
export interface SlotChoice {
  readonly startMinutes: number;
  readonly label: string;
}

export const slotStartChoices = (): SlotChoice[] => {
  const steps: SlotChoice[] = [];
  for (let hour = 6; hour <= 21; hour += 1) {
    steps.push({ startMinutes: hour * 60, label: `${String(hour).padStart(2, "0")}:00` });
    steps.push({ startMinutes: hour * 60 + 30, label: `${String(hour).padStart(2, "0")}:30` });
  }
  return steps;
};

export const slotDurations = (): number[] => [30, 60, 90, 120];

export const slotIsoRange = (
  dayIso: string,
  startMinutes: number,
  durationMinutes: number,
): { startUtc: string; endUtc: string } => {
  // The day input is local; send UTC instants to the API.
  const dayStart = new Date(`${dayIso}T00:00:00`);
  const start = new Date(dayStart.getTime() + startMinutes * 60_000);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { startUtc: start.toISOString(), endUtc: end.toISOString() };
};
