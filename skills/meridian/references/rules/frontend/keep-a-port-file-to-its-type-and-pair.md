## Keep a port file to its type and pair

**Default:** A port file holds only the port type and its `[injectX, provideX]` pair from `useProvideInject`; it imports only types and that helper, never `provide`, `inject`, or values from `vue`.

**When:** Files in `ports/` in Vue and Nuxt frontends.

Bad: A port file that also exports a default implementation object.
Good:
```ts
export interface Recorder { /* members */ }
export const [injectRecorder, provideRecorder] = useProvideInject<Recorder>("Recorder");
```
