<script setup lang="ts">
import { computed } from "vue";
import { injectSession } from "~/features/session";
import { useRivetUserSwitcher } from "./composables/useRivetUserSwitcher";

const session = injectSession();
const { user, actingAs, isLoading, errorMessage, load } = session;
const { users, isLoading: usersLoading, switchTo } = useRivetUserSwitcher();

const userOptions = computed(() =>
  users.value.map((candidate) => ({ label: candidate.name, value: candidate.email })),
);

const retry = (): void => {
  void load();
};

const onSwitch = (email: string): void => {
  void switchTo(email);
};
</script>

<template>
  <div class="min-h-dvh bg-default text-default">
    <header class="border-b border-muted">
      <div
        class="mx-auto flex max-w-2xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <nav aria-label="Main" class="flex flex-wrap items-center gap-x-4 gap-y-1">
          <NuxtLink to="/" class="font-semibold">Room booking</NuxtLink>
          <NuxtLink to="/">Book a room</NuxtLink>
          <NuxtLink to="/my-bookings">My bookings</NuxtLink>
          <NuxtLink to="/rooms">Rooms</NuxtLink>
        </nav>
        <div v-if="user !== null" class="flex items-center gap-2">
          <span class="text-sm text-muted"
            >Booking as <span class="font-medium text-default">{{ user.name }}</span></span
          >
          <USelect
            :model-value="actingAs.email"
            :items="userOptions"
            :loading="usersLoading"
            size="sm"
            aria-label="Choose who you are"
            @update:model-value="onSwitch"
          />
        </div>
      </div>
      <div v-if="errorMessage !== null" class="mx-auto max-w-2xl px-4 pb-4">
        <p class="flex flex-wrap items-center gap-2 text-sm text-error">
          <span role="alert">{{ errorMessage }}</span>
          <UButton label="Try again" variant="link" size="sm" :loading="isLoading" @click="retry" />
        </p>
      </div>
    </header>
    <main class="mx-auto max-w-2xl p-4 pb-16">
      <slot />
    </main>
  </div>
</template>
