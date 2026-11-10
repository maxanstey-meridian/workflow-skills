<script setup lang="ts">
import { onMounted, ref } from "vue";
import { injectRooms } from "../features/rooms";
import type { ErrorResponse } from "../shared/api-types";

const rooms = injectRooms();

const name = ref("");
const capacity = ref(4);
const error = ref<ErrorResponse | null>(null);
const added = ref(false);

const add = async (): Promise<void> => {
  error.value = null;
  added.value = false;
  const outcome = await rooms.addRoom(name.value, capacity.value);
  if (outcome.ok) {
    added.value = true;
    name.value = "";
    capacity.value = 4;
    await rooms.load();
  } else {
    error.value = outcome.error ?? null;
  }
};

onMounted(() => rooms.load());
</script>

<template>
  <section>
    <h1 class="mb-1 text-2xl font-semibold">Rooms</h1>
    <p class="mb-6 text-sm text-gray-600">
      Adding a room needs the staff persona (switch to Ada in the header).
    </p>

    <ul class="mb-8 grid gap-2">
      <li
        v-for="room in rooms.rooms.value"
        :key="room.id"
        class="flex items-center justify-between rounded border border-gray-200 px-3 py-2"
      >
        <span class="font-medium">{{ room.name }}</span>
        <span class="text-sm text-gray-500">seats {{ room.capacity }}</span>
      </li>
    </ul>

    <form class="grid gap-4 rounded-lg border border-gray-200 p-4" @submit.prevent="add">
      <h2 class="text-lg font-medium">Add a room</h2>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="grid gap-1 text-sm">
          Name
          <input
            v-model="name"
            type="text"
            maxlength="100"
            required
            class="rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label class="grid gap-1 text-sm">
          Seats
          <input
            v-model.number="capacity"
            type="number"
            min="1"
            max="999"
            class="rounded border border-gray-300 px-2 py-1"
          />
        </label>
      </div>

      <button
        type="submit"
        class="justify-self-start rounded bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700"
      >
        Add room
      </button>

      <p v-if="added" class="text-sm text-green-800" role="status">Room added.</p>
      <p v-if="error" class="rounded bg-red-50 p-3 text-sm text-red-800" role="alert">
        {{ error.message }}
      </p>
    </form>
  </section>
</template>
