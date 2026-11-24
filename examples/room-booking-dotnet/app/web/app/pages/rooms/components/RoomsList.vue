<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { injectRooms } from "~/features/rooms";
import { useOnPersonaChange } from "~/features/session";
import StateAlert from "~/shared/components/StateAlert.vue";
import type { FieldErrors } from "~/shared/error-envelope";
import { fieldMessage, roomInputErrors } from "../logic/room-input";

type AddRoomFormState =
  | { kind: "editing" }
  | { kind: "signedOut" }
  | { kind: "forbidden" }
  | { kind: "failed"; message: string };

const rooms = injectRooms();
const catalog = rooms.catalog;

const name = ref("");
const capacity = ref("");
const fieldErrors = ref<FieldErrors>({});
const formState = ref<AddRoomFormState>({ kind: "editing" });
const working = ref(false);

const reload = () => {
  void rooms.loadCatalog();
};

onMounted(reload);
useOnPersonaChange(reload);

const limits = computed(() => (catalog.value.kind === "loaded" ? catalog.value.limits : null));

const nameError = computed(() => fieldMessage(fieldErrors.value, "name"));
const capacityError = computed(() => fieldMessage(fieldErrors.value, "capacity"));

const submitRoom = async () => {
  const clientErrors = roomInputErrors(name.value, capacity.value);
  if (Object.keys(clientErrors).length > 0) {
    fieldErrors.value = clientErrors;
    return;
  }
  working.value = true;
  const result = await rooms.addRoom({ name: name.value, capacity: Number(capacity.value) });
  working.value = false;
  switch (result.kind) {
    case "added": {
      name.value = "";
      capacity.value = "";
      fieldErrors.value = {};
      formState.value = { kind: "editing" };
      break;
    }
    case "invalid": {
      fieldErrors.value = result.fieldErrors;
      break;
    }
    case "signedOut": {
      formState.value = { kind: "signedOut" };
      break;
    }
    case "forbidden": {
      formState.value = { kind: "forbidden" };
      break;
    }
    case "failed": {
      formState.value = { kind: "failed", message: result.message };
      break;
    }
  }
};
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold">Rooms</h1>
      <p class="text-sm text-muted">
        The space's bookable rooms. A room can be booked as soon as it appears in this list.
      </p>
    </div>

    <p v-if="catalog.kind === 'loading'">Loading rooms…</p>
    <StateAlert
      v-else-if="catalog.kind === 'signedOut'"
      color="warning"
      title="You are signed out."
      detail="Pick who you are in the header to see the rooms."
    />
    <StateAlert
      v-else-if="catalog.kind === 'forbidden'"
      color="warning"
      title="Rooms are managed by staff."
      detail="Sign in as staff (Maya) to see and add rooms."
    />
    <StateAlert
      v-else-if="catalog.kind === 'failed'"
      color="error"
      title="The rooms could not be loaded."
      :detail="catalog.message"
      retry
      @retry="reload"
    />

    <section v-else class="flex flex-col gap-6 rounded-lg border p-6">
      <header class="flex flex-col gap-4">
        <h2 class="font-medium">Add a room</h2>
        <form
          v-if="formState.kind === 'editing'"
          class="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
          @submit.prevent="submitRoom"
        >
          <UFormField
            label="Name"
            :description="`Members see this name when booking — up to ${limits?.nameMaxLength} characters.`"
            :error="nameError"
          >
            <UInput v-model="name" :maxlength="limits?.nameMaxLength" placeholder="e.g. Studio A" />
          </UFormField>
          <UFormField
            label="Capacity"
            :description="`Between ${limits?.capacityMin} and ${limits?.capacityMax} people.`"
            :error="capacityError"
          >
            <UInput
              v-model="capacity"
              class="w-28"
              type="number"
              :min="limits?.capacityMin"
              :max="limits?.capacityMax"
            />
          </UFormField>
          <UButton
            class="self-start"
            type="button"
            label="Add room"
            :loading="working"
            @click="submitRoom"
          />
        </form>
        <StateAlert
          v-else-if="formState.kind === 'forbidden'"
          color="warning"
          title="Only staff can add rooms."
          detail="Sign in as staff (Maya) to add rooms."
        />
        <StateAlert
          v-else-if="formState.kind === 'signedOut'"
          color="warning"
          title="You are signed out."
          detail="Pick who you are in the header, then add the room."
        />
        <StateAlert
          v-else-if="formState.kind === 'failed'"
          color="error"
          title="The room could not be added."
          :detail="formState.message"
          retry
          @retry="submitRoom"
        />
      </header>

      <div class="flex flex-col gap-2">
        <h2 class="font-medium">
          All rooms
          <span class="text-sm font-normal text-muted">
            {{ catalog.rooms.length === 1 ? "1 room" : `${catalog.rooms.length} rooms` }}
          </span>
        </h2>
        <StateAlert
          v-if="catalog.rooms.length === 0"
          title="No rooms yet."
          detail="Add the first room above — members can book it straight away."
        />
        <ul v-else class="divide-y">
          <li
            v-for="room in catalog.rooms"
            :key="room.id"
            class="flex items-center justify-between py-3"
          >
            <span class="font-medium">{{ room.name }}</span>
            <span class="text-sm text-muted">Up to {{ room.capacity }} people</span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
