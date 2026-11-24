import { ref, type Ref } from "vue";

const store = new Map<string, Ref<unknown>>();

/** Stands in for Nuxt's useState: one shared value per key. */
export const useStateFake = (key: string, init?: () => unknown): Ref<unknown> => {
  const existing = store.get(key);
  if (existing !== undefined) {
    return existing;
  }
  const created = ref(init?.());
  store.set(key, created);
  return created;
};

export const resetNuxtState = (): void => {
  store.clear();
};
