## Ports

A capability port is a **narrow typed contract describing an operation the UI
needs from a boundary**. A provided context is a **reactive feature-facing
surface** made available to a Vue subtree. Both may use the same typed
provide/inject mechanism, but do not pretend a `Ref`-heavy view model is
framework-neutral.

If a dependency is local to one component relationship, it is not a port: pass
it as a prop and communicate upward with events. A provided port/context is
subtree-global by definition and therefore must be wired at a traceable Nuxt
shell.

Rules:

- one port per feature concern, not one port per function
- capability ports are operation-shaped, not DTO-shaped
- provided contexts are view-model-shaped and may expose reactive state plus
  user actions
- port files contain only the type and the injection helper
- ports are for capabilities the subtree depends on, not for disguising an existing client

Good:

- `Auth`
- `Recordings`
- `SubmissionStatusPort`
- `TimelineDisplayPort`

Bad:

- `CurrentUserDtoPort`
- `NotesApiPort` that just mirrors generated methods
- `FormDataService`

### Naming

Use names that make runtime wiring obvious at the call site:

- injected capability consumers use `injectX`
- composition roots use `provideX`
- concrete implementation composables may keep `useX` when they are real Vue composables

Examples:

- `injectAuth` / `provideAuth`
- `injectRecordings` / `provideRecordings`
- `injectSubmissionStatus` / `provideSubmissionStatus`

Why:

- `injectX` makes it obvious that a component is consuming a provided port
- `useX` remains available for concrete composables such as `useRivetAuth` or `usePlatformAuth`
- components should generally import `injectX` from `ports/`, not implementation composables from `composables/`
