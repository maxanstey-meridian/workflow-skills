import { injectLocal, provideLocal } from "@vueuse/core";
import type { InjectionKey } from "vue";

/**
 * Canonical typed provide/inject pair.
 *
 * The tuple is `[inject, provide]`; the inject side throws when called outside a
 * provider so a missing composition root fails loudly instead of returning
 * `undefined`.
 */
export const useProvideInject = <T>(
  name: string,
): readonly [() => T, <U extends T>(value: U) => U] => {
  const key: InjectionKey<T> = Symbol(name);

  const useProvide = <U extends T>(value: U): U => {
    provideLocal(key, value);
    return value;
  };

  const useInject = (): T => {
    const value: T | undefined = injectLocal(key);
    if (value === undefined) {
      throw new Error(`[Context:${name}] inject() called outside provider`);
    }
    return value;
  };

  return [useInject, useProvide];
};
