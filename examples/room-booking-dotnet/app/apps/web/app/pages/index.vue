<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  injectBooking,
  slotTimes,
  durations,
  slotInstant,
  addMinutes,
  formatTime,
} from "../features/booking";
import { injectRooms } from "../features/rooms";
import type { ErrorResponse } from "../shared/api-types";

const rooms = injectRooms();
const booking = injectBooking();

const date = ref(new Date().toISOString().slice(0, 10));
const roomId = ref("");
const startTime = ref("09:00");
const duration = ref(60);
const message = ref<string | null>(null);
const bookingError = ref<ErrorResponse | null>(null);

const selectedRoom = computed(() => rooms.rooms.value.find(room => room.id === roomId.value));
const holds = computed(() => booking.dayHolds.value);

const book = async () => {
  if (!selectedRoom.value) {
    return;
  }
  const startsAt = slotInstant(date.value, startTime.value);
  const endsAt = addMinutes(startsAt, duration.value);
  bookingError.value = null;
  message.value = null;
  const outcome = await booking.book({ roomId: roomId.value, startsAt, endsAt });
  if (outcome.ok) {
    message.value = `Booked ${selectedRoom.value.name} at ${startTime.value} UTC for ${duration.value} minutes.`;
    await booking.loadDay(roomId.value, date.value);
  } else {
    bookingError.value = outcome.error ?? null;
  }
};

const reload = async () => {
  await rooms.load();
  if (!roomId.value && rooms.rooms.value.length > 0) {
    roomId.value = rooms.rooms.value[0]!.id;
  }
  await booking.loadDay(roomId.value, date.value);
};

onMounted(reload);
watch([roomId, date], () => booking.loadDay(roomId.value, date.value));
</script>

<template>
  <section>
    <h1 class="mb-1 text-2xl font-semibold">Book a room</h1>
    <p class="mb-6 text-sm text-gray-600">
      Pick a day and a free slot. Check in within 15 minutes of the start, or the booking is
      released for someone else.
    </p>

    <form class="mb-8 grid gap-4 rounded-lg border border-gray-200 p-4" @submit.prevent="book">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="grid gap-1 text-sm">
          Day
          <input v-model="date" type="date" class="rounded border border-gray-300 px-2 py-1" />
        </label>

        <label class="grid gap-1 text-sm">
          Room
          <select v-model="roomId" class="rounded border border-gray-300 px-2 py-1">
            <option v-for="room in rooms.rooms.value" :key="room.id" :value="room.id">
              {{ room.name }} ({{ room.capacity }})
            </option>
          </select>
        </label>

        <label class="grid gap-1 text-sm">
          Starts (UTC)
          <select v-model="startTime" class="rounded border border-gray-300 px-2 py-1">
            <option v-for="slot in slotTimes()" :key="slot" :value="slot">{{ slot }}</option>
          </select>
        </label>

        <label class="grid gap-1 text-sm">
          For
          <select v-model.number="duration" class="rounded border border-gray-300 px-2 py-1">
            <option v-for="minutes in durations" :key="minutes" :value="minutes">
              {{ minutes }} minutes
            </option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        class="justify-self-start rounded bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700"
      >
        Book
      </button>
    </form>

    <p v-if="message" class="mb-6 rounded bg-green-50 p-3 text-sm text-green-800" role="status">
      {{ message }}
    </p>
    <p v-if="bookingError" class="mb-6 rounded bg-red-50 p-3 text-sm text-red-800" role="alert">
      {{ bookingError.message }}
    </p>

    <h2 class="mb-2 text-lg font-medium">Already held on {{ date }}</h2>
    <p v-if="holds.length === 0" class="text-sm text-gray-600">
      Nothing is booked in this room on this day yet.
    </p>
    <ul v-else class="grid gap-2">
      <li
        v-for="hold in holds"
        :key="`${hold.startsAt}-${hold.endsAt}`"
        class="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm"
      >
        <span>{{ formatTime(hold.startsAt) }}–{{ formatTime(hold.endsAt) }} UTC</span>
        <span class="text-gray-500">{{ hold.status }}</span>
      </li>
    </ul>
  </section>
</template>
