<script setup lang="ts">
import { provideRooms, useRivetRooms } from "~/features/rooms";
import { injectSession } from "~/features/session";
import { serverRefusalText } from "~/shared/logic/refusal";
import { useRivetAddRoom } from "./rooms/composables/useRivetAddRoom";

const session = injectSession();
const { capabilities } = session;

const rooms = provideRooms(useRivetRooms());
const { rooms: roomsList, isLoading: roomsLoading, errorMessage: roomsError } = rooms;
void rooms.load();

const addRoom = useRivetAddRoom();
const { name, capacity, isAdding, canAdd, refusal, errorMessage } = addRoom;

const onSubmit = (): void => {
  void addRoom.add();
};
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold">Rooms</h1>

    <p v-if="capabilities === null" class="mt-6 text-muted">Loading your details…</p>
    <template v-else>
      <form v-if="capabilities.canManageRooms" class="mt-6" @submit.prevent="onSubmit">
        <h2 class="font-medium">Add a room</h2>
        <div class="mt-2 flex flex-wrap items-end gap-3">
          <label class="block text-sm">
            Name
            <UInput v-model="name" class="mt-1 block" />
          </label>
          <label class="block text-sm">
            Seats
            <UInput v-model="capacity" type="number" class="mt-1 block max-w-24" />
          </label>
          <UButton type="submit" label="Add a room" :loading="isAdding" :disabled="!canAdd" />
        </div>
        <p class="mt-1 text-sm text-muted">Members can book it straight away.</p>
      </form>
      <p v-else class="mt-6 text-muted">
        Rooms are added by staff. If a room you need is missing, ask a staff member to add it.
      </p>

      <p
        v-if="refusal !== null"
        role="alert"
        class="mt-4 rounded-lg border border-error bg-error/10 p-3 text-sm text-error"
      >
        {{
          serverRefusalText(refusal, "The room was not added. Change the details and try again.")
        }}
        <span v-for="(messages, field) in refusal.errors ?? {}" :key="field" class="block">
          {{ field }}: {{ messages.join(", ") }}
        </span>
      </p>
      <p
        v-else-if="errorMessage !== null"
        role="alert"
        class="mt-4 rounded-lg border border-error bg-error/10 p-3 text-sm text-error"
      >
        {{ errorMessage }}
      </p>

      <p
        v-if="roomsError !== null"
        role="alert"
        class="mt-4 rounded-lg border border-error bg-error/10 p-3 text-sm text-error"
      >
        {{ roomsError }}
      </p>

      <h2 class="mt-8 font-medium">Every room</h2>
      <p v-if="roomsLoading && roomsList.length === 0" class="mt-2 text-sm text-muted">
        Loading the rooms…
      </p>
      <p v-else-if="roomsList.length === 0" class="mt-2 text-sm text-muted">No rooms yet.</p>
      <ul v-else class="mt-2 flex flex-col gap-2">
        <li v-for="room in roomsList" :key="room.id" class="rounded-lg border border-muted p-3">
          <span class="font-medium">{{ room.name }}</span>
          <span class="text-sm text-muted"> — seats {{ room.capacity }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>
