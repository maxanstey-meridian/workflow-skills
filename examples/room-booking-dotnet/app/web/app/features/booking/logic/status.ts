import type { components } from "@cowork/contracts";

export type BookingStatus = components["schemas"]["BookingStatusValue"];
export type BookingAction = components["schemas"]["BookingActionValue"];

const statusLabels: Readonly<Record<BookingStatus, string>> = {
  booked: "Booked",
  checkedIn: "Checked in",
  cancelled: "Cancelled",
  released: "Released (no check-in)",
};

export const statusLabel = (status: BookingStatus): string => statusLabels[status];

const actionLabels: Readonly<Record<BookingAction, string>> = {
  cancel: "Cancel booking",
  checkIn: "Check in",
};

export const actionLabel = (action: BookingAction): string => actionLabels[action];

export type StatusColor = "primary" | "success" | "neutral";

const statusColors: Readonly<Record<BookingStatus, StatusColor>> = {
  booked: "primary",
  checkedIn: "success",
  cancelled: "neutral",
  released: "neutral",
};

export const statusColor = (status: BookingStatus): StatusColor => statusColors[status];
