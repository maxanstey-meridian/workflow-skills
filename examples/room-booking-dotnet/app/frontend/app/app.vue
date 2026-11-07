<script setup lang="ts">
import { useIdentityApi } from "./adapters/identity-api";
import { configureRivet } from "./api";
import { provideIdentity, type UserChoice } from "./ports/identity";

// app.vue is the application-wide composition root: it builds the API client,
// wires the acting identity into it, and provides the identity port.
const runtimeConfig = useRuntimeConfig();
const identity = provideIdentity(useIdentityApi());
configureRivet({
  baseUrl: runtimeConfig.public.apiBase,
  tokenProvider: () => identity.current?.id,
});

const navItems = [
  { label: "Book a room", to: "/" },
  { label: "My bookings", to: "/bookings" },
  { label: "Rooms", to: "/rooms" },
];

const chosen = (choice: UserChoice) => identity.signIn(choice);
</script>

<template>
  <div class="shell">
    <header class="shell__bar">
      <nav class="shell__nav" aria-label="Main">
        <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to">{{ item.label }}</NuxtLink>
      </nav>
      <IdentityPicker :users="identity.users" :current="identity.current" @choose="chosen" />
    </header>

    <main class="stack stack--wide">
      <p v-if="identity.current === null" role="note">
        Choose who you are to continue — the demo acts as one of the seeded people.
      </p>
      <NuxtPage v-else />
    </main>
  </div>
</template>
