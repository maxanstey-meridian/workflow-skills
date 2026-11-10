import { injectLocal, provideLocal } from "@vueuse/core";
import type { InjectionKey } from "vue";

/**
 * The one helper for a port's [injectX, provideX] pair: the inject throws when called
 * outside a provider, and the provide returns the exact implementation it was given.
 */
export const useProvideInject = <T>(name: string) => {
  const key: InjectionKey<T> = Symbol(name);
  const useProvide = <U extends T>(value: U): U => {
    provideLocal(key, value);
    return value;
  };
  const useInject = (): T => {
    const value = injectLocal(key);
    if (value === undefined) {
      throw new Error(`[Context:${name}] inject() called outside provider`);
    }
    return value;
  };
  return [useInject, useProvide] as const;
};
