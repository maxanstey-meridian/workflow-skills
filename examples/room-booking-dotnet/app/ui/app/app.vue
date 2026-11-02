<script setup lang="ts">
import { provideSession, useRivetSession } from "~/features/session";

const session = provideSession(useRivetSession());
void session.load();
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
