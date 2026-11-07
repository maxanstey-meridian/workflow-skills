import { inject, provide, type InjectionKey, type Ref } from "vue";
import type { BookingView } from "../../../api";

export interface MyBookingsPort {
  /** The member's bookings, newest activity last. Server rows carry availableActions. */
  readonly bookings: Ref<BookingView[]>;
  readonly loading: Ref<boolean>;
  readonly problem: Ref<string | null>;
  readonly reload: () => Promise<void>;
  readonly cancel: (bookingId: string) => Promise<void>;
  readonly checkIn: (bookingId: string) => Promise<void>;
}

const key: InjectionKey<MyBookingsPort> = Symbol("MyBookings");

export const provideMyBookings = (implementation: MyBookingsPort): MyBookingsPort => {
  provide(key, implementation);
  return implementation;
};

export const injectMyBookings = (): MyBookingsPort => {
  const port = inject(key);
  if (port === undefined) {
    throw new Error("MyBookings was not provided by the page composition root");
  }
  return port;
};
