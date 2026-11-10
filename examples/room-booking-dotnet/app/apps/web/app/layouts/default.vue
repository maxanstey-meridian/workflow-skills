<script setup lang="ts">
import { injectSession } from "../features/session";

const session = injectSession();

const links = [
  { to: "/", label: "Book a room" },
  { to: "/bookings", label: "My bookings" },
  { to: "/rooms", label: "Rooms" },
];
</script>

<template>
  <div class="mx-auto max-w-3xl p-6">
    <header class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <nav class="flex gap-4">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="font-medium underline-offset-4 hover:underline"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <label class="flex items-center gap-2 text-sm">
        Acting as
        <select
          :value="session.current.value"
          class="rounded border border-gray-300 px-2 py-1"
          @change="session.setPersona(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="persona in session.personas" :key="persona.key" :value="persona.key">
            {{ persona.name }} ({{ persona.role }})
          </option>
        </select>
      </label>
    </header>

    <main>
      <slot />
    </main>
  </div>
</template>
