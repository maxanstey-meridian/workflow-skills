## Create port pairs with the typed helper

**Default:** Create every port's `[injectX, provideX]` pair with the one `useProvideInject` helper: its inject throws when called outside a provider, and its provide returns the exact implementation it was given, not the narrowed port type.

**When:** Vue and Nuxt frontends. The helper is built on Vue's `InjectionKey` and VueUse's `provideLocal` and `injectLocal`. Because provide returns the concrete type, the root keeps root-only members while injectors see only the port.

Bad: `provide("recorder", value)` and `inject("recorder")` with a string key, returning `undefined` when missing.
Good:
```ts
export const useProvideInject = <T>(name: string) => {
  const key: InjectionKey<T> = Symbol(name);
  const useProvide = <U extends T>(value: U): U => { provideLocal(key, value); return value; };
  const useInject = (): T => {
    const value = injectLocal(key);
    if (value === undefined) throw new Error(`[Context:${name}] inject() called outside provider`);
    return value;
  };
  return [useInject, useProvide] as const;
};
```
