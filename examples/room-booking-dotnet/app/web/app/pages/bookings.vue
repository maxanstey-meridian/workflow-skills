<script setup lang="ts">
import { provideBooking, useBookingApi } from "~/features/booking";
import MyBookings from "./bookings/components/MyBookings.vue";

provideBooking(useBookingApi());
</script>

<template>
  <MyBookings />
</template>
