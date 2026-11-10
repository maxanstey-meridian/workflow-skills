<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  injectBooking,
  statusLabel,
  formatTime,
  formatDay,
  actionEnabled,
  actionHint,
} from "../features/booking";
import type { ErrorResponse } from "../shared/api-types";

const booking = injectBooking();

const outcome = ref<{ ok: boolean; text: string } | null>(null);

const act = async (
  id: string,
  action: "cancel" | "check-in",
  label: string
): Promise<void> => {
  outcome.value = null;
  const result =
    action === "cancel" ? await booking.cancel(id) : await booking.checkIn(id);
  if (result.ok) {
    outcome.value = { ok: true, text: `${label} — done.` };
  } else {
    const error = result.error as ErrorResponse | undefined;
    outcome.value = { ok: false, text: error?.message ?? "That did not work; please try again." };
  }
  await booking.loadMine();
};

onMounted(() => booking.loadMine());
</script>

<template>
  <section>
    <h1 class="mb-1 text-2xl font-semibold">My bookings</h1>
    <p class="mb-6 text-sm text-gray-600">
      Check in from 15 minutes before your booking starts; after 15 minutes past the start an
      unchecked booking is released.
    </p>

    <p
      v-if="outcome"
      class="mb-6 rounded p-3 text-sm"
      :class="outcome.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'"
      role="status"
    >
      {{ outcome.text }}
    </p>

    <p v-if="booking.myBookings.value.length === 0" class="text-sm text-gray-600">
      You have no bookings yet. <NuxtLink to="/" class="underline">Book a room</NuxtLink>.
    </p>

    <ul class="grid gap-3">
      <li
        v-for="item in booking.myBookings.value"
        :key="item.id"
        class="rounded-lg border border-gray-200 p-4"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <span class="font-medium">{{ item.roomName }}</span>
          <span class="text-sm text-gray-500">{{ statusLabel(item.status) }}</span>
        </div>
        <div class="text-sm text-gray-600">
          {{ formatDay(item.startsAt) }}, {{ formatTime(item.startsAt) }}–{{
            formatTime(item.endsAt)
          }} UTC
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded px-3 py-1.5 text-sm font-medium"
            :class="
              actionEnabled(item, 'check-in')
                ? 'bg-green-700 text-white hover:bg-green-600'
                : 'cursor-not-allowed bg-gray-100 text-gray-400'
            "
            :disabled="!actionEnabled(item, 'check-in')"
            :title="actionHint(item.availableActions.find(a => a.action === 'check-in') ?? { action: 'check-in', enabled: false, reason: null })"
            @click="act(item.id, 'check-in', 'Checked in')"
          >
            Check in
          </button>
          <button
            type="button"
            class="rounded px-3 py-1.5 text-sm font-medium"
            :class="
              actionEnabled(item, 'cancel')
                ? 'border border-red-300 text-red-700 hover:bg-red-50'
                : 'cursor-not-allowed border border-gray-200 text-gray-400'
            "
            :disabled="!actionEnabled(item, 'cancel')"
            :title="actionHint(item.availableActions.find(a => a.action === 'cancel') ?? { action: 'cancel', enabled: false, reason: null })"
            @click="act(item.id, 'cancel', 'Cancelled')"
          >
            Cancel
          </button>
        </div>
        <p
          v-for="action in item.availableActions.filter(candidate => !candidate.enabled)"
          :key="action.action"
          class="mt-2 text-xs text-gray-500"
        >
          {{ actionHint(action) }}
        </p>
      </li>
    </ul>
  </section>
</template>
