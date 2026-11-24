export { useBookingApi } from "./composables/useBookingApi";
export { formatDate, formatSlotRange, formatTime } from "./logic/datetime";
export {
  actionLabel,
  statusColor,
  statusLabel,
  type BookingAction,
  type BookingStatus,
  type StatusColor,
} from "./logic/status";
export {
  injectBooking,
  provideBooking,
  type Booking,
  type BookingActionResult,
  type BookingCapability,
  type BookingResult,
  type BookingsState,
  type BookSlot,
} from "./ports/booking";
