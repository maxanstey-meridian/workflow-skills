<script setup lang="ts">
// Application-lifetime composition root: the session capability is genuinely app-wide.
import { provideSession } from "./features/session";
import { useSession } from "./features/session/use-session";

provideSession(useSession());
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
