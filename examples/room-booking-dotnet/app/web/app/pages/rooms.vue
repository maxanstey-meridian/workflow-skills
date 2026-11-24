<script setup lang="ts">
import { provideRooms, useRoomsApi } from "~/features/rooms";
import RoomsList from "./rooms/components/RoomsList.vue";

provideRooms(useRoomsApi());
</script>

<template>
  <RoomsList />
</template>
