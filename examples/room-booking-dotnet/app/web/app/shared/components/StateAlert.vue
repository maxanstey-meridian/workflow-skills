<script setup lang="ts">
// The one design for page-level states that are messages, not data:
// signed out, wrong role, failures, and empty results.
defineProps<{
  title: string;
  detail?: string;
  color?: "neutral" | "warning" | "error";
  retry?: boolean;
}>();

const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <UAlert class="w-full" :title="title" :description="detail" :color="color ?? 'neutral'" />
    <UButton v-if="retry" label="Try again" variant="outline" @click="emit('retry')" />
  </div>
</template>
