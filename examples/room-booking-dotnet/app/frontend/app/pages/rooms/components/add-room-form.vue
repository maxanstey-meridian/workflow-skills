<script setup lang="ts">
import { injectRoomAdmin } from "../ports/room-admin";

// Dumb view: the form forwards staff intent; problems come from the server.
const roomAdmin = injectRoomAdmin();

const name = defineModel<string>("name", { required: true });
const capacity = defineModel<number>("capacity", { required: true });

const add = () => {
  void roomAdmin.add(name.value, capacity.value);
};
</script>

<template>
  <form @submit.prevent="add">
    <label>
      Room name
      <input v-model="name" name="name" required />
    </label>
    <label>
      Seats
      <input v-model.number="capacity" type="number" name="capacity" min="1" max="500" required />
    </label>
    <button type="submit">Add room</button>
  </form>
</template>
