## Create port pairs with the typed helper

**Default:** Create every port's `[injectX, provideX]` pair with `useProvideInject`: `inject` throws outside a provider, and `provide` returns the concrete implementation rather than the narrowed port type.

**When:** Vue and Nuxt frontends (built on Vue `InjectionKey` and VueUse `provideLocal`/`injectLocal`), so roots keep root-only members while injectors see only the port.

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
