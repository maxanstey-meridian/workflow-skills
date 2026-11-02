<script setup lang="ts">
import type { components } from "@roombooking/contracts";
import { computed } from "vue";
import { provideRooms, useRivetRooms } from "~/features/rooms";
import { injectSession } from "~/features/session";
import { checkInCopy } from "~/shared/logic/check-in";
import { formatDay, formatInterval } from "~/shared/logic/clock";
import RoomSlotCard from "./index/components/room-slot-card.vue";
import { useBookingDraft } from "./index/composables/useBookingDraft";
import { useRivetAvailability } from "./index/composables/useRivetAvailability";
import { useRivetBooking } from "./index/composables/useRivetBooking";

type RoomDto = components["schemas"]["RoomDto"];

const session = injectSession();
const { capabilities } = session;

const rooms = provideRooms(useRivetRooms());
const { rooms: roomsList, isLoading: roomsLoading } = rooms;
void rooms.load();

const draft = useBookingDraft();
const { dateKey, roomId, startTime, endTime, timesInOrder, canSubmit } = draft;
const availability = useRivetAvailability(draft.dateKey);
const {
  busyByRoomId,
  isLoading: availabilityLoading,
  errorMessage: availabilityError,
} = availability;
const booking = useRivetBooking();
const { bookedBooking, refusalMessage, isBooking } = booking;

const selectedRoom = computed(
  () => roomsList.value.find((room) => room.id === roomId.value) ?? null,
);

const selectedRoomLabel = computed(() => selectedRoom.value?.name ?? "");

const bookedSummary = computed(() => {
  const booked = bookedBooking.value;
  if (booked === null) {
    return "";
  }
  return `${booked.roomName} on ${formatDay(booked.start)}, ${formatInterval(booked.start, booked.end)}.`;
});

const bookedCheckInCopy = computed(() => checkInCopy(bookedBooking.value?.checkInClosesAt ?? null));

const onPickRoom = (room: RoomDto): void => {
  draft.roomId.value = room.id;
};

const onSubmit = (): void => {
  const start = draft.startInstant.value;
  const end = draft.endInstant.value;
  const pickedRoom = draft.roomId.value;
  if (pickedRoom === null || start === null || end === null) {
    return;
  }
  void booking.book(pickedRoom, start, end);
};

const onBookAnother = (): void => {
  booking.reset();
  draft.reset();
};
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold">Book a room</h1>
    <p class="mt-1 text-muted">Pick a day, choose a room from what's still free, then hold it.</p>

    <p v-if="capabilities === null" class="mt-6 text-muted">Loading your details…</p>
    <div v-else-if="!capabilities.canBookRooms" class="mt-6">
      <p>Only members book rooms.</p>
      <p class="mt-1 text-muted">
        You're signed in as staff, who add rooms instead.
        <NuxtLink to="/rooms" class="underline">See the rooms</NuxtLink>.
      </p>
    </div>

    <template v-else>
      <div v-if="bookedBooking !== null" class="mt-6 rounded-lg border border-success p-4">
        <h2 class="font-medium">Room booked</h2>
        <p class="mt-1">{{ bookedSummary }}</p>
        <p v-if="bookedCheckInCopy !== null" class="mt-1 text-sm text-muted">
          {{ bookedCheckInCopy }}
        </p>
        <div class="mt-3 flex gap-2">
          <UButton to="/my-bookings" label="See your bookings" />
          <UButton label="Book another room" variant="soft" @click="onBookAnother" />
        </div>
      </div>

      <template v-else>
        <p
          v-if="refusalMessage !== null"
          role="alert"
          class="mt-4 rounded-lg border border-error bg-error/10 p-3 text-sm text-error"
        >
          {{ refusalMessage }}
        </p>

        <div class="mt-6">
          <h2 class="font-medium">Which day?</h2>
          <UInput v-model="dateKey" type="date" class="mt-2 max-w-48" />
        </div>

        <fieldset class="mt-6">
          <legend class="font-medium">Which room?</legend>
          <p v-if="roomsLoading" class="mt-2 text-sm text-muted">Loading the rooms…</p>
          <p v-else-if="availabilityError !== null" role="alert" class="mt-2 text-sm text-error">
            {{ availabilityError }}
          </p>
          <p v-else-if="roomsList.length === 0" class="mt-2 text-sm text-muted">
            No rooms yet. Staff can add one on the
            <NuxtLink to="/rooms" class="underline">Rooms page</NuxtLink>.
          </p>
          <div v-else class="mt-2 grid gap-3 sm:grid-cols-2">
            <RoomSlotCard
              v-for="room in roomsList"
              :key="room.id"
              :room="room"
              :busy="busyByRoomId[room.id] ?? []"
              :availability-loading="availabilityLoading"
              :selected="room.id === roomId"
              @select="onPickRoom(room)"
            />
          </div>
        </fieldset>

        <form v-if="roomId !== null" class="mt-6" @submit.prevent="onSubmit">
          <fieldset>
            <legend class="font-medium">What time?</legend>
            <p class="text-sm text-muted">Booking {{ selectedRoomLabel }}.</p>
            <div class="mt-2 flex gap-3">
              <label class="block text-sm">
                From
                <UInput v-model="startTime" type="time" class="mt-1 block" />
              </label>
              <label class="block text-sm">
                Until
                <UInput v-model="endTime" type="time" class="mt-1 block" />
              </label>
            </div>
            <p class="mt-1 text-sm text-muted">
              The room is held for you until 15 minutes after the start unless you check in.
            </p>
            <p
              v-if="startTime !== '' && endTime !== '' && !timesInOrder"
              class="text-sm text-error"
            >
              Choose an end time after the start time.
            </p>
            <UButton
              type="submit"
              label="Book this room"
              class="mt-3"
              :loading="isBooking"
              :disabled="!canSubmit"
            />
          </fieldset>
        </form>
      </template>
    </template>
  </section>
</template>
