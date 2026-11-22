## Name a port pair inject and provide

**Preference:** Name a port's exported pair `[injectX, provideX]` in that order, keeping `useX` for concrete composables.

**When:** Port files in Vue/Nuxt frontends: `injectX` signals an injected capability, `provideX(usePlatformRecorder())` signals root wiring, and `useX` is the implementation.

Bad: `export const [useRecorder, provideRecorder] = useProvideInject<Recorder>("Recorder");`
Good: `export const [injectRecorder, provideRecorder] = useProvideInject<Recorder>("Recorder");` with `usePlatformRecorder()`.
