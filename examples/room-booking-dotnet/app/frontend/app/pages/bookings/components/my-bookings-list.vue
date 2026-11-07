<script setup lang="ts">
import {
  actionPresentation,
  formatSlot,
  statusPresentation,
} from "../../../logic/booking-presentation";
import { injectMyBookings } from "../ports/my-bookings";

// Dumb view: each row offers exactly the actions the server says are available.
const myBookings = injectMyBookings();

const onAction = (action: string, bookingId: string) => {
  void (action === "check-in" ? myBookings.checkIn(bookingId) : myBookings.cancel(bookingId));
};
</script>

<template>
  <ul>
    <li v-for="booking in myBookings.bookings.value" :key="booking.id">
      <strong>{{ booking.roomName }}</strong> ·
      <span>{{ formatSlot(booking.startUtc, booking.endUtc) }}</span> ·
      <span>{{ statusPresentation(booking.status).label }}</span>

      <span v-for="action in booking.availableActions" :key="action">
        <button type="button" @click="onAction(action, booking.id)">
          {{ actionPresentation(action).label }}
        </button>
        {{ actionPresentation(action).description }}
      </span>
    </li>
  </ul>
</template>
