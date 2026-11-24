<script setup lang="ts">
import { provideSession, usePersona } from "~/features/session";

provideSession(usePersona());
</script>

<template>
  <div class="min-h-screen">
    <AppHeader />
    <main class="mx-auto w-full max-w-3xl px-4 py-8">
      <slot />
    </main>
  </div>
</template>
