<script setup lang="ts">
import { injectSession } from "~/features/session";
import BookingCard from "./my-bookings/components/booking-card.vue";
import { useRivetBookings } from "./my-bookings/composables/useRivetBookings";

const session = injectSession();
const { capabilities } = session;

const { bookings, isLoading, errorMessage, refusalMessage, checkIn, cancel } = useRivetBookings();
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold">My bookings</h1>

    <p v-if="capabilities === null" class="mt-6 text-muted">Loading your details…</p>
    <div v-else-if="!capabilities.canBookRooms" class="mt-6">
      <p>Only members book rooms, so there are no bookings to see here.</p>
      <p class="mt-1 text-muted">
        You're signed in as staff, who add rooms instead.
        <NuxtLink to="/rooms" class="underline">See the rooms</NuxtLink>.
      </p>
    </div>

    <template v-else>
      <p
        v-if="refusalMessage !== null"
        role="alert"
        class="mt-4 rounded-lg border border-error bg-error/10 p-3 text-sm text-error"
      >
        {{ refusalMessage }}
      </p>
      <p
        v-else-if="errorMessage !== null"
        role="alert"
        class="mt-4 rounded-lg border border-error bg-error/10 p-3 text-sm text-error"
      >
        {{ errorMessage }}
      </p>

      <p v-if="isLoading && bookings.length === 0" class="mt-6 text-muted">
        Loading your bookings…
      </p>
      <p v-else-if="bookings.length === 0" class="mt-6">
        You have no bookings yet.
        <NuxtLink to="/" class="underline">Book a room</NuxtLink>.
      </p>
      <ul v-else class="mt-6 flex flex-col gap-3">
        <li v-for="booking in bookings" :key="booking.id">
          <BookingCard
            :booking="booking"
            @check-in="void checkIn(booking.id)"
            @cancel="void cancel(booking.id)"
          />
        </li>
      </ul>
    </template>
  </section>
</template>
