import { resetNuxtState, useStateFake } from "./nuxt-state";

/**
 * The test stand-in for `nuxt/app`: only what the app's composables import,
 * backed by in-memory state instead of a Nuxt instance.
 */
export const useState = useStateFake;

export const resetNuxtApp = resetNuxtState;
