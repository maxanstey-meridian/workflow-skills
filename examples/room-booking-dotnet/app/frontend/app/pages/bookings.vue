<script setup lang="ts">
import { onMounted } from "vue";
import { useMyBookingsApi } from "./bookings/adapters/my-bookings-api";
import MyBookingsList from "./bookings/components/my-bookings-list.vue";
import { provideMyBookings } from "./bookings/ports/my-bookings";

// The page is the composition root for the member's bookings.
const myBookings = provideMyBookings(useMyBookingsApi());

onMounted(() => {
  void myBookings.reload();
});
</script>

<template>
  <div class="stack">
    <h1>My bookings</h1>
    <p>
      Check in when your slot starts — if you do not within 15 minutes, the room is released for
      other members.
    </p>
    <p v-if="myBookings.problem.value" role="alert">{{ myBookings.problem.value }}</p>
    <p v-if="myBookings.loading.value">Loading…</p>
    <p v-else-if="myBookings.bookings.value.length === 0">No bookings yet.</p>
    <MyBookingsList />
  </div>
</template>
