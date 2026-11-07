<script setup lang="ts">
import { computed } from "vue";
import { formatSlot } from "../../../logic/booking-presentation";
import { slotDurations, slotIsoRange, slotStartChoices } from "../logic/slot-options";
import { injectRoomSearch, type Slot } from "../ports/room-search";

// Dumb view: reads the provided capability, forwards user intent.
const roomSearch = injectRoomSearch();

const day = defineModel<string>("day", { required: true });
const startMinutes = defineModel<number>("startMinutes", { required: true });
const durationMinutes = defineModel<number>("durationMinutes", { required: true });

const currentSlot = computed<Slot>(() => {
  const slot = slotIsoRange(day.value, startMinutes.value, durationMinutes.value);
  return { startUtc: slot.startUtc, endUtc: slot.endUtc };
});

const slotSummary = computed<string>(() =>
  formatSlot(currentSlot.value.startUtc, currentSlot.value.endUtc),
);

const search = () => {
  void roomSearch.search(currentSlot.value);
};
</script>

<template>
  <form @submit.prevent="search">
    <div class="stack">
      <label>
        1. Pick a day
        <input v-model="day" type="date" name="day" />
      </label>
      <label>
        2. Pick a start time and length
        <select v-model.number="startMinutes" name="start">
          <option
            v-for="choice in slotStartChoices()"
            :key="choice.startMinutes"
            :value="choice.startMinutes"
          >
            {{ choice.label }}
          </option>
        </select>
        <select v-model.number="durationMinutes" name="duration">
          <option v-for="duration in slotDurations()" :key="duration" :value="duration">
            {{ duration }} minutes
          </option>
        </select>
      </label>
      <div>
        <button type="submit" :disabled="roomSearch.searching.value">
          {{ roomSearch.searching.value ? "Searching…" : "3. Search rooms" }}
        </button>
      </div>
      <p v-if="roomSearch.searchProblem.value" role="alert">{{ roomSearch.searchProblem.value }}</p>
      <p v-if="roomSearch.rooms.value.length > 0">Showing rooms for {{ slotSummary }}</p>
    </div>
  </form>
</template>
