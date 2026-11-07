<script setup lang="ts">
import { ref } from "vue";
import { formatSlot } from "../logic/booking-presentation";
import { useRoomSearchApi } from "./index/adapters/room-search-api";
import RoomsForSlot from "./index/components/rooms-for-slot.vue";
import SlotPicker from "./index/components/slot-picker.vue";
import { provideRoomSearch } from "./index/ports/room-search";

// The page is the composition root: build the capability, provide it, and let
// the child components use it.
const roomSearch = provideRoomSearch(useRoomSearchApi());

const day = ref(isoDay(new Date()));
const startMinutes = ref(9 * 60);
const durationMinutes = ref(60);

function isoDay(at: Date): string {
  const offset = at.getTimezoneOffset();
  const local = new Date(at.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}
</script>

<template>
  <div class="stack">
    <h1>Book a room</h1>
    <p v-if="roomSearch.lastBooking.value === null">
      Pick when you need a room, search, and book one that is free. Once booked, you check in when
      the slot starts.
    </p>

    <div v-if="roomSearch.lastBooking.value !== null" class="confirmation">
      <h2>Booked</h2>
      <p>
        {{ roomSearch.lastBooking.value.roomName }},
        {{
          formatSlot(roomSearch.lastBooking.value.startUtc, roomSearch.lastBooking.value.endUtc)
        }}. A reminder email goes out the evening before. Check in any time from the start of your
        slot — if you don't within 15 minutes, the room is released for other members.
      </p>
    </div>

    <SlotPicker
      v-model:day="day"
      v-model:start-minutes="startMinutes"
      v-model:duration-minutes="durationMinutes"
    />
    <RoomsForSlot v-if="roomSearch.rooms.value.length > 0" />
  </div>
</template>
