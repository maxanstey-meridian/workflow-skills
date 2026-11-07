// Presentation mapping only: server values to labels, colours, and date text.
// None of this re-derives a server rule; the server's answers (availableActions,
// isAvailable, status) arrive on the DTOs and are displayed as-is.
import type { BookingActionWire, BookingStatusWire } from "../api";

export interface ActionPresentation {
  readonly action: BookingActionWire;
  readonly label: string;
  readonly description: string;
}

export const statusPresentation = (
  status: BookingStatusWire,
): { label: string; tone: "neutral" | "info" | "warning" | "error" | "success" } =>
  status === "booked"
    ? { label: "Upcoming", tone: "info" }
    : status === "checked-in"
      ? { label: "Checked in", tone: "success" }
      : status === "cancelled"
        ? { label: "Cancelled", tone: "neutral" }
        : { label: "Released (not checked in)", tone: "warning" };

export const actionPresentation = (action: BookingActionWire): ActionPresentation =>
  action === "check-in"
    ? { action, label: "Check in", description: "Confirm your arrival in the room." }
    : { action, label: "Cancel", description: "The room becomes bookable by other members." };

export const formatDay = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export const formatSlot = (startIso: string, endIso: string): string =>
  `${formatDay(startIso)} ${formatTime(startIso)} – ${formatTime(endIso)}`;
