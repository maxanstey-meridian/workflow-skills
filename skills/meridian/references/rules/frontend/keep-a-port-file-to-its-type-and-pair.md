## Keep a port file to its type and pair

**Default:** A port file holds only the port's type and its `[injectX, provideX]` pair from the `useProvideInject` helper; it imports types and that helper, never `provide`, `inject`, or a value from `vue`, and declares nothing else.

**When:** Files in `ports/` in a Vue or Nuxt frontend. A port is the type that names one capability a subtree needs.

Bad: a port file that also exports a default implementation object.
Good:
```ts
export interface Recorder { /* members */ }
export const [injectRecorder, provideRecorder] = useProvideInject<Recorder>("Recorder");
```
