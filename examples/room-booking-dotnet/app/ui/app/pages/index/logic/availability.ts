import type { components } from "@roombooking/contracts";
import { formatInterval } from "~/shared/logic/clock";

type AvailabilityInterval = components["schemas"]["AvailabilityInterval"];

/** What a room card shows for the picked day. Presentation only — the server
 * owns the availability read model. */
export interface BusyRow {
  startInstant: string;
  endInstant: string;
  label: string;
}

export const busyRows = (busy: readonly AvailabilityInterval[]): BusyRow[] =>
  [...busy]
    .sort((first, second) => first.start.localeCompare(second.start))
    .map((interval) => ({
      startInstant: interval.start,
      endInstant: interval.end,
      label: formatInterval(interval.start, interval.end),
    }));
