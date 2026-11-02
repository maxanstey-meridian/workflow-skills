import { computed, ref } from "vue";
import { toBookingInstant, todayIsoKey } from "~/shared/logic/clock";

/**
 * The client-side state of the booking form: the picked day, room, and times.
 * The server re-checks everything; these checks only keep obviously incomplete
 * choices from reaching it.
 */
export const useBookingDraft = () => {
  const dateKey = ref(todayIsoKey(new Date()));
  const roomId = ref<string | null>(null);
  const startTime = ref("");
  const endTime = ref("");

  const startInstant = computed(() =>
    dateKey.value === "" || startTime.value === ""
      ? null
      : toBookingInstant(dateKey.value, startTime.value),
  );

  const endInstant = computed(() =>
    dateKey.value === "" || endTime.value === ""
      ? null
      : toBookingInstant(dateKey.value, endTime.value),
  );

  const timesInOrder = computed(
    () =>
      startInstant.value !== null &&
      endInstant.value !== null &&
      startInstant.value < endInstant.value,
  );

  const canSubmit = computed(() => roomId.value !== null && timesInOrder.value);

  const reset = (): void => {
    roomId.value = null;
    startTime.value = "";
    endTime.value = "";
  };

  return {
    dateKey,
    roomId,
    startTime,
    endTime,
    startInstant,
    endInstant,
    timesInOrder,
    canSubmit,
    reset,
  };
};
