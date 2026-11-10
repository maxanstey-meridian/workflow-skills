## Name a port pair inject and provide

**Preference:** Use `injectX` and `provideX`, in that order, for a port's exported pair, and keep `useX` for concrete composables.

**When:** Port files in a Vue or Nuxt frontend. `injectX` shows a consumer depends on an already-wired capability, `provideX(usePlatformRecorder())` shows a root wiring one, and `useX` is the implementation.

Bad: `export const [useRecorder, provideRecorder] = useProvideInject<Recorder>("Recorder");`
Good: `export const [injectRecorder, provideRecorder] = useProvideInject<Recorder>("Recorder");`, with `usePlatformRecorder()` as the implementation.
