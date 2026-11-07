<script setup lang="ts">
import type { UserChoice } from "../ports/identity";

const props = defineProps<{
  users: readonly UserChoice[];
  current: UserChoice | null;
}>();

const emit = defineEmits<{ choose: [choice: UserChoice] }>();

const onChoose = (event: Event) => {
  const id = event.target instanceof HTMLSelectElement ? event.target.value : undefined;
  const choice = props.users.find((user) => user.id === id);
  if (choice !== undefined) {
    emit("choose", choice);
  }
};
</script>

<template>
  <label>
    Acting as
    <select name="identity" :value="props.current?.id ?? ''" @change="onChoose">
      <option value="" disabled>Choose…</option>
      <option v-for="user in props.users" :key="user.id" :value="user.id">{{ user.name }}</option>
    </select>
  </label>
</template>
