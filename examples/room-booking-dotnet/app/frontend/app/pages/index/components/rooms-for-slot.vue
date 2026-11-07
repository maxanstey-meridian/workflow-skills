<script setup lang="ts">
import { injectRoomSearch } from "../ports/room-search";

// Dumb view: what the member sees is the server's answer about each room,
// including whether the slot is free.
const roomSearch = injectRoomSearch();

const book = (roomId: string) => {
  void roomSearch.book(roomId);
};
</script>

<template>
  <div>
    <ul>
      <li v-for="room in roomSearch.rooms.value" :key="room.roomId">
        <strong>{{ room.name }}</strong>
        <span> · seats {{ room.capacity }}</span>
        <span v-if="room.isAvailable"> · free for this slot</span>
        <span v-else class="taken"> · booked for this slot</span>
        <button
          v-if="room.isAvailable"
          type="button"
          :disabled="roomSearch.booking.value === 'sending'"
          @click="book(room.roomId)"
        >
          Book this room
        </button>
      </li>
    </ul>
  </div>
</template>
