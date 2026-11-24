<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { injectBooking, type BookingResult } from "~/features/booking";
import { injectRooms } from "~/features/rooms";
import { useOnPersonaChange } from "~/features/session";
import StateAlert from "~/shared/components/StateAlert.vue";
import { buildSlot, durations, startTimes, todayIso } from "../logic/slot";
import { slotSummary } from "../logic/slot-summary";

type BookingPageState = { kind: "idle" } | { kind: "booking" } | BookingResult;

const rooms = injectRooms();
const booking = injectBooking();

const date = ref(todayIso());
const startTime = ref("");
const durationMinutes = ref(60);
const selectedRoomId = ref<string | null>(null);
const bookingState = ref<BookingPageState>({ kind: "idle" });

const freeRooms = rooms.freeRooms;

const slot = computed(() => buildSlot(date.value, startTime.value, durationMinutes.value));

const durationItems = durations.map((minutes) => ({
  label: `${minutes} minutes`,
  value: minutes,
}));

const selectedRoom = computed(() => {
  const state = freeRooms.value;
  if (state.kind !== "loaded") {
    return null;
  }
  return state.rooms.find((room) => room.id === selectedRoomId.value) ?? null;
});

const summary = computed(() => {
  const current = slot.value;
  const room = selectedRoom.value;
  if (current === null || room === null) {
    return "";
  }
  return slotSummary(room.name, current);
});

const refreshAvailability = () => {
  selectedRoomId.value = null;
  const current = slot.value;
  if (current !== null) {
    void rooms.loadFreeRooms(current);
  }
};

watch(slot, () => {
  bookingState.value = { kind: "idle" };
  refreshAvailability();
});
useOnPersonaChange(refreshAvailability);

const selectRoom = (roomId: string) => {
  selectedRoomId.value = roomId;
  bookingState.value = { kind: "idle" };
};

const confirmBooking = async () => {
  const current = slot.value;
  const room = selectedRoom.value;
  if (current === null || room === null) {
    return;
  }
  bookingState.value = { kind: "booking" };
  const result = await booking.book({
    roomId: room.id,
    startsAt: current.startsAt,
    endsAt: current.endsAt,
  });
  bookingState.value = result;
  if (result.kind === "booked") {
    refreshAvailability();
  }
  if (result.kind === "slotTaken") {
    void rooms.loadFreeRooms(current);
  }
};

const errorMessages = (fieldErrors: Readonly<Record<string, readonly string[]>>): string[] =>
  Object.values(fieldErrors).flat();
</script>

<template>
  <div class="flex flex-col gap-8">
    <h1 class="text-2xl font-semibold">Book a room</h1>

    <section class="flex flex-col gap-4">
      <h2 class="font-medium">When do you need the room?</h2>
      <div class="grid gap-4 sm:grid-cols-3">
        <UFormField label="Date">
          <UInput v-model="date" type="date" />
        </UFormField>
        <UFormField label="Start time">
          <USelect
            v-model="startTime"
            class="w-36"
            :items="startTimes"
            placeholder="Pick a start time"
          />
        </UFormField>
        <UFormField label="Duration">
          <USelect v-model="durationMinutes" class="w-36" :items="durationItems" />
        </UFormField>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="font-medium">Which room is free?</h2>
      <p v-if="freeRooms.kind === 'loading'">Checking which rooms are free…</p>
      <StateAlert
        v-else-if="freeRooms.kind === 'idle'"
        title="Pick a start time to see which rooms are free for that slot."
      />
      <template v-else-if="freeRooms.kind === 'loaded'">
        <StateAlert
          v-if="freeRooms.rooms.length === 0"
          title="No rooms are free for this slot."
          detail="Try another time or a shorter duration — the rooms free for the slot appear here."
        />
        <ul v-else class="flex flex-col gap-2">
          <li v-for="room in freeRooms.rooms" :key="room.id">
            <UButton
              :label="`${room.name} — up to ${room.capacity} people`"
              :variant="room.id === selectedRoomId ? 'solid' : 'outline'"
              @click="selectRoom(room.id)"
            />
          </li>
        </ul>
      </template>
      <StateAlert
        v-else-if="freeRooms.kind === 'signedOut'"
        color="warning"
        title="You are signed out."
        detail="Pick who you are in the header to see which rooms are free."
      />
      <StateAlert
        v-else-if="freeRooms.kind === 'forbidden'"
        color="warning"
        title="Rooms are booked by members."
        detail="Sign in as a member (Alex or Sam) to book a room."
      />
      <StateAlert
        v-else-if="freeRooms.kind === 'failed'"
        color="error"
        title="It is not known which rooms are free."
        :detail="freeRooms.message"
        retry
        @retry="refreshAvailability"
      />
    </section>

    <section v-if="selectedRoom !== null" class="flex flex-col gap-3">
      <h2 class="font-medium">Review and book</h2>
      <p>{{ summary }}</p>
      <UButton
        class="self-start"
        label="Book this slot"
        :loading="bookingState.kind === 'booking'"
        @click="confirmBooking"
      />
    </section>

    <template v-if="bookingState.kind === 'slotTaken'">
      <UAlert
        color="warning"
        :title="bookingState.message"
        description="Pick another room or another time — the rooms free for this slot have been refreshed above."
      />
    </template>
    <UAlert
      v-else-if="bookingState.kind === 'inPast'"
      color="warning"
      :title="bookingState.message"
      description="Pick a start time later today, or another day."
    />
    <UAlert
      v-else-if="bookingState.kind === 'invalid'"
      color="error"
      title="This slot cannot be booked as picked."
      :description="errorMessages(bookingState.fieldErrors).join(' ')"
    />
    <StateAlert
      v-else-if="bookingState.kind === 'signedOut'"
      color="warning"
      title="You are signed out."
      detail="Pick who you are in the header, then book again."
    />
    <StateAlert
      v-else-if="bookingState.kind === 'forbidden'"
      color="warning"
      title="Rooms are booked by members."
      detail="Sign in as a member (Alex or Sam) to book a room."
    />
    <StateAlert
      v-else-if="bookingState.kind === 'failed'"
      color="error"
      title="The booking could not be made."
      :detail="bookingState.message"
      retry
      @retry="confirmBooking"
    />
    <UAlert
      v-else-if="bookingState.kind === 'booked'"
      color="success"
      description="Check in when the slot starts — 15 minutes after the start the booking is released."
    >
      <template #title>
        Booked. See it in <NuxtLink to="/bookings" class="underline">My bookings</NuxtLink>.
      </template>
    </UAlert>
  </div>
</template>
