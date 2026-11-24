import { injectLocal, provideLocal } from "@vueuse/core";
import type { InjectionKey } from "vue";

/**
 * Creates a `[injectX, provideX]` pair for one capability port.
 *
 * `provide` returns the concrete implementation, which the composition root
 * may keep using; injectors see only the port type. Injecting outside a
 * provider throws instead of returning `undefined`.
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
