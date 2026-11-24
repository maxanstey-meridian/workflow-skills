<script setup lang="ts">
import { provideBooking, useBookingApi } from "~/features/booking";
import { provideRooms, useRoomsApi } from "~/features/rooms";
import BookRoom from "./index/components/BookRoom.vue";

provideRooms(useRoomsApi());
provideBooking(useBookingApi());
</script>

<template>
  <BookRoom />
</template>
