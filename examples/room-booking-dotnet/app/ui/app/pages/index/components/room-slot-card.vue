<script setup lang="ts">
import type { components } from "@roombooking/contracts";
import type { BusyRow } from "../logic/availability";

type RoomDto = components["schemas"]["RoomDto"];

const props = defineProps<{
  room: RoomDto;
  busy: BusyRow[];
  availabilityLoading: boolean;
  selected: boolean;
}>();

const emit = defineEmits<{ select: [] }>();
</script>

<template>
  <button
    type="button"
    class="w-full rounded-lg border p-4 text-left"
    :class="props.selected ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary'"
    :aria-pressed="props.selected"
    @click="emit('select')"
  >
    <span class="block font-medium">{{ props.room.name }}</span>
    <span class="block text-sm text-muted">Seats {{ props.room.capacity }}</span>
    <span class="mt-2 block text-sm">
      <span v-if="props.availabilityLoading" class="text-muted">Checking that day…</span>
      <span v-else-if="props.busy.length === 0">Free all day.</span>
      <template v-else>
        <span class="block text-muted">Already taken:</span>
        <span v-for="row in props.busy" :key="row.startInstant" class="block">{{ row.label }}</span>
      </template>
    </span>
  </button>
</template>
