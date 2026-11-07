<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoomAdminApi } from "./rooms/adapters/room-admin-api";
import AddRoomForm from "./rooms/components/add-room-form.vue";
import { provideRoomAdmin } from "./rooms/ports/room-admin";

// The page is the composition root for staff room management.
const roomAdmin = provideRoomAdmin(useRoomAdminApi());

const name = ref("");
const capacity = ref(4);

onMounted(() => {
  void roomAdmin.reload();
});
</script>

<template>
  <div class="stack">
    <h1>Rooms</h1>
    <p v-if="roomAdmin.problem.value" role="alert">{{ roomAdmin.problem.value }}</p>
    <p v-if="roomAdmin.loading.value">Loading…</p>

    <section>
      <h2>Add a room</h2>
      <AddRoomForm v-model:name="name" v-model:capacity="capacity" />
    </section>

    <section>
      <h2>All rooms</h2>
      <p v-if="roomAdmin.rooms.value.length === 0">No rooms yet.</p>
      <ul>
        <li v-for="room in roomAdmin.rooms.value" :key="room.id">
          {{ room.name }} · seats {{ room.capacity }}
        </li>
      </ul>
    </section>
  </div>
</template>
