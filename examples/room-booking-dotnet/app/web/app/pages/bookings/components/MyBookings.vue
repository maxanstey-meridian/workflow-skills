<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  actionLabel,
  formatDate,
  formatSlotRange,
  formatTime,
  injectBooking,
  statusColor,
  statusLabel,
  type Booking,
  type BookingAction,
} from "~/features/booking";
import { useOnPersonaChange } from "~/features/session";
import StateAlert from "~/shared/components/StateAlert.vue";
import { actionOutcome } from "../logic/action-outcome";

const booking = injectBooking();
const bookings = booking.myBookings;

const confirmTarget = ref<Booking | null>(null);
const outcome = ref<string | null>(null);
const working = ref(false);

const reload = () => {
  void booking.loadMyBookings();
};

onMounted(reload);
useOnPersonaChange(reload);

const confirmOpen = computed({
  get: () => confirmTarget.value !== null,
  set: (open: boolean) => {
    if (!open) {
      confirmTarget.value = null;
    }
  },
});

const cancelDescription = computed(() => {
  const target = confirmTarget.value;
  if (target === null) {
    return "";
  }
  return `${target.roomName} on ${formatDate(target.startsAt)} at ${formatTime(
    target.startsAt,
  )}. The slot frees up for others straight away.`;
});

const takeAction = async (row: Booking, action: BookingAction) => {
  working.value = true;
  const result = action === "cancel" ? await booking.cancel(row.id) : await booking.checkIn(row.id);
  working.value = false;
  outcome.value = actionOutcome(result);
};

const runAction = (row: Booking, action: BookingAction) => {
  if (action === "cancel") {
    requestCancel(row);
    return;
  }
  void takeAction(row, action);
};

const requestCancel = (row: Booking) => {
  confirmTarget.value = row;
};

const confirmCancel = () => {
  const target = confirmTarget.value;
  if (target === null) {
    return;
  }
  confirmTarget.value = null;
  void takeAction(target, "cancel");
};
</script>

<template>
  <div class="flex flex-col gap-8">
    <h1 class="text-2xl font-semibold">My bookings</h1>

    <p v-if="bookings.kind === 'loading'">Loading your bookings…</p>
    <template v-else-if="bookings.kind === 'loaded'">
      <StateAlert
        v-if="bookings.bookings.length === 0"
        title="You have no bookings yet."
        detail="Pick a room and a slot from the Book a room page — your bookings appear here."
      />
      <ul v-else class="divide-y">
        <li
          v-for="row in bookings.bookings"
          :key="row.id"
          class="flex flex-wrap items-center gap-4 py-3"
          :class="{ 'opacity-60': row.status === 'cancelled' || row.status === 'released' }"
        >
          <div class="flex flex-col">
            <span class="font-medium">{{ row.roomName }}</span>
            <span class="text-sm text-muted">
              {{ formatSlotRange(row.startsAt, row.endsAt) }}
            </span>
          </div>
          <UBadge class="ml-auto" :color="statusColor(row.status)">
            {{ statusLabel(row.status) }}
          </UBadge>
          <div v-if="row.availableActions.length > 0" class="flex gap-2">
            <UButton
              v-for="action in row.availableActions"
              :key="action"
              :label="actionLabel(action)"
              :variant="action === 'cancel' ? 'outline' : 'solid'"
              :disabled="working"
              @click="runAction(row, action)"
            />
          </div>
        </li>
      </ul>
    </template>
    <StateAlert
      v-else-if="bookings.kind === 'signedOut'"
      color="warning"
      title="You are signed out."
      detail="Pick who you are in the header to see your bookings."
    />
    <StateAlert
      v-else-if="bookings.kind === 'forbidden'"
      color="warning"
      title="My bookings shows a member's bookings."
      detail="Sign in as a member (Alex or Sam) to see yours."
    />
    <StateAlert
      v-else-if="bookings.kind === 'failed'"
      color="error"
      title="Your bookings could not be loaded."
      :detail="bookings.message"
      retry
      @retry="reload"
    />

    <UAlert v-if="outcome !== null" :title="outcome" />

    <UModal
      v-model:open="confirmOpen"
      title="Cancel this booking?"
      :description="cancelDescription"
    >
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Keep booking" variant="outline" @click="confirmOpen = false" />
          <UButton label="Cancel booking" color="error" @click="confirmCancel" />
        </div>
      </template>
    </UModal>
  </div>
</template>
