<script setup lang="ts">
import { computed } from "vue";
import { injectSession, personaByEmail } from "~/features/session";

const { persona, personas, selectPersona } = injectSession();

const personaItems = computed(() =>
  personas.map((candidate) => ({
    label: `${candidate.name} (${candidate.role})`,
    value: candidate.email,
  })),
);

const changePersona = (email: string) => {
  const next = personaByEmail(email);
  if (next !== undefined) {
    selectPersona(next);
  }
};

const navLinks = [
  { to: "/", label: "Book a room" },
  { to: "/bookings", label: "My bookings" },
  { to: "/rooms", label: "Rooms" },
];
</script>

<template>
  <header class="border-b">
    <div class="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-4 px-4 py-3">
      <NuxtLink to="/" class="text-lg font-semibold">Cowork</NuxtLink>
      <nav class="flex items-center gap-4">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="text-sm text-muted hover:text-highlighted"
          active-class="font-medium text-highlighted"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
      <UFormField class="ml-auto" label="Signed in as" size="sm">
        <USelect
          class="w-52"
          :items="personaItems"
          :model-value="persona.email"
          @update:model-value="changePersona"
        />
      </UFormField>
    </div>
  </header>
</template>
