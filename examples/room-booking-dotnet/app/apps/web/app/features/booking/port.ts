import { useProvideInject } from "../../shared/use-provide-inject";
import type { Booking } from "./use-booking";

export type { Booking, BookOutcome } from "./use-booking";

export const [injectBooking, provideBooking] = useProvideInject<Booking>("Booking");
