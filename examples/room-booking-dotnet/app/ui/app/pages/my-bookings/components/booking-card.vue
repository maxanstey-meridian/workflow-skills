<script setup lang="ts">
import type { components } from "@roombooking/contracts";
import { computed, ref } from "vue";
import { checkInCopy } from "~/shared/logic/check-in";
import { bookingTimes, statusLabel } from "../logic/booking-display";

type BookingDto = components["schemas"]["BookingDto"];

const props = defineProps<{ booking: BookingDto }>();

const emit = defineEmits<{ "check-in": []; cancel: [] }>();

const canCheckIn = computed(() => props.booking.availableActions.includes("checkIn"));
const canCancel = computed(() => props.booking.availableActions.includes("cancel"));

const statusCopy = computed(() => statusLabel(props.booking.status));
const times = computed(() => bookingTimes(props.booking));
const checkInDeadline = computed(() => checkInCopy(props.booking.checkInClosesAt));

const confirmingCancel = ref(false);

const onConfirmCancel = (): void => {
  confirmingCancel.value = false;
  emit("cancel");
};
</script>

<template>
  <article class="rounded-lg border border-muted p-4">
    <div class="flex items-baseline justify-between gap-2">
      <h2 class="font-medium">{{ props.booking.roomName }}</h2>
      <span class="text-sm text-muted">{{ statusCopy }}</span>
    </div>
    <p class="text-sm">{{ times }}</p>

    <div v-if="canCheckIn" class="mt-2 flex flex-wrap items-center gap-2">
      <UButton label="Check in" size="sm" @click="emit('check-in')" />
      <span v-if="checkInDeadline !== null" class="text-sm text-muted">{{ checkInDeadline }}</span>
    </div>

    <div v-if="canCancel" class="mt-2">
      <UButton
        v-if="!confirmingCancel"
        label="Cancel booking"
        color="error"
        variant="soft"
        size="sm"
        @click="confirmingCancel = true"
      />
      <div v-else>
        <p class="text-sm">Cancel this booking? The room is freed for others straight away.</p>
        <div class="mt-1 flex gap-2">
          <UButton label="Yes, cancel it" color="error" size="sm" @click="onConfirmCancel" />
          <UButton
            label="Keep booking"
            variant="soft"
            size="sm"
            @click="confirmingCancel = false"
          />
        </div>
      </div>
    </div>
  </article>
</template>
