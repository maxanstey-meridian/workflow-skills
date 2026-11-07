import { ref, type Ref } from "vue";
import { client, unwrap, type BookingView } from "../../../api";

interface MyBookingsEffects {
  readonly bookings: Ref<BookingView[]>;
  readonly loading: Ref<boolean>;
  readonly problem: Ref<string | null>;
  readonly reload: () => Promise<void>;
  readonly cancel: (bookingId: string) => Promise<void>;
  readonly checkIn: (bookingId: string) => Promise<void>;
}

const problemOf = (status: number, message: string | undefined): string =>
  message ?? `The request failed (${status}).`;

export function useMyBookingsApi(): MyBookingsEffects {
  const bookings = ref<BookingView[]>([]);
  const loading = ref(false);
  const problem = ref<string | null>(null);

  const reload = async (): Promise<void> => {
    loading.value = true;
    problem.value = null;
    const result = await client.GET("/api/bookings");
    const outcome = unwrap(result);
    if (outcome.ok) {
      bookings.value = outcome.data.bookings;
    } else {
      bookings.value = [];
      problem.value = problemOf(outcome.failure.status, outcome.failure.body?.message);
    }
    loading.value = false;
  };

  const act = async (bookingId: string, action: "cancel" | "check-in"): Promise<void> => {
    problem.value = null;
    const path = { path: { id: bookingId } };
    const result =
      action === "cancel"
        ? await client.POST("/api/bookings/{id}/cancel", { params: path })
        : await client.POST("/api/bookings/{id}/check-in", { params: path });
    const outcome = unwrap(result);
    if (outcome.ok) {
      bookings.value = bookings.value.map((b) => (b.id === outcome.data.id ? outcome.data : b));
    } else {
      problem.value = problemOf(outcome.failure.status, outcome.failure.body?.message);
    }
  };

  return {
    bookings,
    loading,
    problem,
    reload: () => reload(),
    cancel: (id) => act(id, "cancel"),
    checkIn: (id) => act(id, "check-in"),
  };
}
