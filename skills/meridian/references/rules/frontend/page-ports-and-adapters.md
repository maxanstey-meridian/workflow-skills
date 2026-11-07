## Page-colocated Ports and Adapters

Use this when designing, reviewing, or refactoring a Vue/Nuxt frontend toward a
decoupled, page-colocated, ports-and-adapters shape with:

- dumb views/components
- page/layout/app composition roots
- pure logic separated from framework code
- explicit capability boundaries
- typed runtime wiring via provide/inject

This is the Meridian frontend default. Its sections are one design and are read
together: each assumes the others.

### Default Recommendation

Treat **`app.vue`, layouts, and pages** as the only composition roots.

This is deliberately stricter than generic provide/inject advice. Vue cannot
navigate from `injectX()` to the runtime provider. Restricting every `provideX()`
to three Nuxt shell locations makes the wiring searchable and predictable.

Do not default to:

- global stores for everything
- component-local business logic
- fake API service wrappers around generated clients
- `app/features/...` for code that is genuinely page-local

The stable boundary is the **page/layout-owned feature**, not the composable and
not the component.

### Core Principle

Keep views dumb and dependencies explicit.

The point of page-colocated ports and adapters is not “do DI on the frontend”.

The point is:

- rendering stays in views
- pure logic stays pure
- framework code stays at the edge
- capability wiring happens once in `app.vue`, a layout, or a page
- runtime seams are explicit instead of ambient

`provide` / `inject` is just the cleanest Vue mechanism for expressing that boundary.

### Dependency Rule

```text
logic/         ← pure TypeScript, zero Vue/Nuxt imports
ports/         ← typed capability contracts and provided-context contracts
adapters/      ← boundary implementations satisfying capability ports
composables/   ← framework-rich implementations / reactive contexts
app.vue/pages/layouts ← the only composition roots
components/    ← leaf views or explicitly named feature containers
```

Dependency direction is explicit rather than inferred solely from list order.

Meaning:

- `logic/` depends on nothing framework-specific
- `ports/` contain contracts and wiring helpers only; a framework-neutral
  capability port exposes plain values, while a provided Vue context may expose
  `Ref`/`ComputedRef`
- `adapters/` implement a port against generated clients, storage, or platform
  APIs; a pure adapter may depend only on `logic/` and `ports/`
- `composables/` may depend on `logic/`, `ports/`, generated Rivet clients, Pinia, VueUse, etc.
- only `app.vue`, layouts, and pages provide concrete capabilities or contexts
- leaf components render and emit; feature containers may consume composed
  contexts but never construct infrastructure

#### Cross-page feature shape

`app/features/<feature>/` is for a product capability spanning multiple
composition roots. It may contain `logic/`, `ports/`, `adapters/`, implementation
composables, and public types. A shell may import and construct that
implementation; the feature never provides itself.

Consumers import only the feature's deliberate public contracts and pure logic,
not its internal adapters. `app.vue`, layouts, and pages remain the composition
roots; a feature folder is an ownership boundary, not an ambient singleton or
automatic store.

### Standard Layout

Page-local code is colocated by default.

```text
app/pages/forms/
├── index.vue
├── [id].vue
├── components/
├── composables/
├── logic/
├── ports/
└── adapters/
```

For the root page, use an adjacent folder:

```text
app/pages/
├── index.vue
└── index/
    ├── components/
    ├── composables/
    ├── logic/
    ├── ports/
    └── adapters/
```

Do not promote code until its ownership and lifetime require it.

### Promotion

A page or layout subtree must not import another page's local implementation
directories. When code is needed by more than one subtree, preserve ownership:

- move a genuinely cross-cutting primitive to `app/shared/`
- move a cross-page product capability to `app/features/<feature>/`
- expose a feature-owned public contract rather than deep-importing its
  internals

`app/shared/` means no product feature owns the code. Multiple consumers alone
do not make that true. A promoted feature keeps its shape, and consumers import
only its public contract:

```text
app/features/auth/
├── ports/
│   └── auth.ts          ← the feature's port (type + provide/inject)
├── logic/
│   └── auth.ts          ← the feature's pure logic (e.g. getInitials)
└── index.ts             ← the public contract: exports Auth, injectAuth, provideAuth, getInitials
```

Rules:

- Promote only what is genuinely shared. The port type and provide/inject helper promote when the capability is wired at one composition root (e.g. layout) but consumed in another subtree (e.g. page components). Pure logic promotes when used by components in multiple page subtrees.
- Preserve feature ownership. Cross-page Auth or Recordings code belongs in
  `app/features/auth/` or `app/features/recordings/` when it remains a product
  capability. Use `app/shared/` for genuinely generic/co-owned primitives.
- No migration shims. Delete pass-through files left at old locations after
  moving code. A deliberate public feature entry point is specifically
  `app/features/<feature>/index.ts`; workspace package entry files named explicitly
  by `package.json#exports` and generated barrels are also valid. Other `index.ts`
  barrels are not public feature contracts by filename alone.
- Implementations stay with their owner. A root-local implementation stays
  beside its page/layout. A cross-page implementation may live in
  `app/features/<feature>/`, but only `app.vue`, a layout, or a page constructs
  and provides it.
- Delete the page-local file. When a port or logic module is promoted, remove the original — do not leave a re-export stub behind.

Example — Auth port promoted from page-local to the auth feature:

```text
Before (page-local only):
  app/pages/index/ports/auth.ts           ← owns Auth type + provide/inject
  app/pages/index/composables/useRivetAuth.ts
  app/pages/index/logic/auth-card.ts       ← owns getInitials

After (layout provides auth, sidebar + pages consume):
  app/features/auth/ports/auth.ts          ← promoted: Auth type + provide/inject
  app/features/auth/logic/auth.ts          ← promoted: getInitials
  app/features/auth/index.ts               ← the public contract
  app/layouts/default/composables/useRivetAuth.ts   ← stays: only layout calls it
  app/layouts/default.vue                  ← composition root: provideAuth(useRivetAuth())
```

```ts
// app/features/auth/ports/auth.ts — the promoted port
import type { Ref } from "vue";
import type { components } from "@<scope>/contracts";
import { useProvideInject } from "~/composables/useProvideInject";

type CurrentUserDto = components["schemas"]["CurrentUserDto"];

export interface Auth {
  currentSession: Ref<CurrentUserDto | null>;
  errorMessage: Ref<string | null>;
  isLoading: Ref<boolean>;
  load: () => Promise<void>;
}

export const [injectAuth, provideAuth] = useProvideInject<Auth>("Auth");
```

```ts
// app/layouts/default/composables/useRivetAuth.ts — composable stays at composition root
import type { Auth } from "~/features/auth";
// ...implementation...

// app/layouts/default.vue — composition root
import { provideAuth } from "~/features/auth";
import { useRivetAuth } from "./default/composables/useRivetAuth";

const auth = provideAuth(useRivetAuth());
```

```ts
// app/layouts/default/components/app-sidebar.vue — consumer imports the feature's public contract
import { injectAuth, getInitials } from "~/features/auth";

// app/pages/index/components/auth-card.vue — another consumer, same import
import { injectAuth, getInitials } from "~/features/auth";
```

### Logic

`logic/` is pure TypeScript.

Hard rule:

- no imports from `vue`
- no imports from `nuxt`
- no imports from `#imports`
- no framework packages

Put in `logic/`:

- pure transforms
- calculations
- derivation rules
- immutable data shaping
- domain-ish UI rules that do not require reactivity

If something can be a pure function, put it here.

Components may import `logic/` directly because it has zero framework dependencies.

### Ports

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
- a port file holds only the port's type and its `[injectX, provideX]` pair from
  `useProvideInject` (Provide / Inject Pattern, below): it imports types and
  that helper, never `provide`, `inject`, or a value from `vue`, and declares
  nothing else
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

#### Naming

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

### Provide / Inject Pattern

Use typed provide/inject helpers based on Vue `InjectionKey` and VueUse local injection.

This is the canonical frontend port pattern. The exported pair must be named
`injectX` first and `provideX` second:

```ts
export const [injectRecorder, provideRecorder] = useProvideInject<Recorder>("Recorder");
```

Do not export `useRecorder` for a provided port. `useX` names are for concrete implementation
composables or framework hooks. The distinction matters at call sites:

- `provideRecorder(usePlatformRecorder(...))` means the composition root is wiring the capability.
- `injectRecorder()` means the consumer depends on an already-wired capability.
- `usePlatformRecorder()` means the root is constructing a concrete implementation.

Canonical helper:

```ts
import { injectLocal, provideLocal } from "@vueuse/core";
import type { InjectionKey } from "vue";

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
```

The shape is structural, not just a search for `throw`: the returned tuple is
`[inject, provide]`; the inject function binds the result of `inject` or
`injectLocal`, tests the missing polarity (`undefined`, `null`, or a deliberate
falsy guard), throws on that branch, then returns that same binding as narrowed
`T`. A reversed guard that throws when the value is present is invalid.

Why this pattern:

- typed capability seam
- subtree-scoped dependency wiring
- no prop drilling
- no ambient global soup
- hard failure outside the composition root
- `provide*` preserves and returns the concrete implementation type so the composition
  root retains root-only orchestration capabilities while `inject*` consumers see only `T`

The provider is an identity function with a registration side effect. It must not
narrow its return to `T`: `U extends T` proves the implementation satisfies the
port, stores it under the narrow injection key, and returns the exact `U` supplied.
This does not weaken the consumer boundary because `inject*` still returns `T`.

This is runtime wiring, not the architecture itself.

### Adapters

Adapters are optional boundary implementations. They translate between a
capability port and HTTP, generated clients, storage, desktop APIs, or another
runtime. A pure adapter is the simplest form; an adapter may be constructed by
a composable when Vue lifecycle or reactivity owns its lifetime.

Rules:

- adapters should not contain presentation state
- pure adapters have zero Vue/Nuxt imports
- if construction needs `ref`, `watch`, or lifecycle hooks, keep that reactive
  shell in a composable and keep protocol translation in the adapter where it
  remains meaningful

Example:

```ts
import {
  createSection,
  removeSectionById,
  reorderSections,
} from "../logic/section-state";
import type { SectionStatePort } from "../ports/section-state";

export const sectionStateAdapter: SectionStatePort = {
  createSection,
  removeSection: removeSectionById,
  reorderSections,
};
```

```ts
// composables/useRivetAuth.ts
import { ref } from "vue";
import { client, type components } from "@<scope>/contracts";
import type { Auth } from "../ports/auth";

type CurrentUserDto = components["schemas"]["CurrentUserDto"];

export const useRivetAuth = () => {
  const currentSession = ref<CurrentUserDto | null>(null);
  const errorMessage = ref<string | null>(null);
  const isLoading = ref(false);

  const load = async (): Promise<void> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const result = await client.GET("/api/session");

      if (result.error === undefined) {
        currentSession.value = result.data;
        return;
      }

      errorMessage.value = "Unable to load the auth session.";
    } catch {
      errorMessage.value = "Unable to load the auth session.";
    } finally {
      isLoading.value = false;
    }
  };

  const implementation = {
    currentSession,
    errorMessage,
    isLoading,
    load,
    clearLocalSession: () => {
      currentSession.value = null;
      errorMessage.value = null;
    },
  };

  implementation satisfies Auth;
  return implementation;
};
```

```ts
// page composition root
import { provideAuth } from "./ports/auth";
import { useRivetAuth } from "./composables/useRivetAuth";

const auth = provideAuth(useRivetAuth());
auth.clearLocalSession(); // Available to the composition root.
```

```ts
// descendant component or composable
const injected = injectAuth();
injected.clearLocalSession(); // Type error: not part of Auth.
```

This composable-direct path is often the better default on the frontend.
Validate a named implementation with `implementation satisfies Auth` rather
than adding a `(): Auth` return annotation when it has capabilities needed only
by the composition root. The former checks port compliance without erasing the
richer inferred implementation type or applying excess-property checks to an
object literal.

### Provide implementations, not projections

**Law:** A composition root should not unpack a composable and manually repack selected
members into a port-shaped object. Pass the implementation directly to `provideX`;
the preserved concrete return type lets the root retain persistence and orchestration
capabilities while injected consumers receive only the narrow port. A page that needs more of a capability widens its port; it doesn't unpack it, repack it, or add getters to hand out pieces.

```ts
// Wrong: the page has become a hand-written adapter.
const effects = useFormEffects();

provideFieldEffects({
  effects: effects.effects,
  fields: sections.allFields,
  connectors: discovery.connectors,
  add: effects.add,
  remove: effects.removeEffect,
});

// Right: provide the owned implementation directly.
const effects = provideFieldEffects(useFormEffects());
```

This keeps pages as wiring shells rather than dependency assemblers. If direct
provision is impossible because a page must gather and forward state from several
unrelated composables, treat that as evidence that ownership is unclear, the port
republishes capabilities it does not own, or a dependent composable should inject
those capabilities itself.

Do not merely move that page-level assembly into a
`useFoo({ dependencyA, dependencyB, ... })` options bag. Runtime collaborators
should normally be obtained through their typed injected capabilities; constructor
arguments are reserved for identity and genuine per-instance configuration.

### Composables

Composables are the framework-rich layer.

They may own:

- `ref` / `reactive` / `computed` / `watch`
- VueUse
- Pinia when appropriate
- generated Rivet client calls
- side effects
- loading flags
- local UI orchestration

Composables should:

- inject a port with `injectX` when they depend on a provided capability
- keep pure logic out of themselves where feasible
- expose a clean capability-shaped surface

Composables should not:

- grow into god-objects
- hide large amounts of pure business logic

If a composable gets too large, pull pure logic down into `logic/`.

### Two Valid Implementation Styles

Both are valid. Choose the simpler one that keeps boundaries honest.

#### 1. Pure adapter + thin composable

Use this when there is real pure logic worth separating.

Pattern:

- page provides adapter
- composable injects port via `injectX`
- composable holds reactive state and delegates logic to the port

#### 2. Composable directly implements the port

Use this when the implementation is already inherently reactive/stateful and an adapter would just add ceremony.

Pattern:

- composable returns the port-shaped capability
- page provides that composable result directly

This is valid:

```ts
provideAuth(useRivetAuth());
```

Do not create an adapter just to satisfy a pattern if the composable is already the cleanest implementation.

### Nuxt Shells As Composition Roots

Compose capabilities only in:

- `app.vue` for application-wide lifetime
- layouts for shell/session lifetime spanning pages
- pages for route lifetime

Components and composables never call `provideX`. Local component dependencies
use props/events. This is a traceability law, not a preference. Test harnesses
(`*.spec.ts`, `*.test.ts`, `__tests__/**`, and a `tests/`, `test/` or `e2e/` tree
at the root of the frontend or of its package) may call `provideX` to stand in for the shell.

Composition roots may:

- create implementation composables
- provide ports
- compose presentational components

Composition roots should not:

- become a dump for business logic
- reimplement pure transforms inline
- hide composition behind global setup unless it is genuinely app-wide

Example:

```ts
import { provideSectionState } from "../ports/section-state";
import { sectionStateAdapter } from "../adapters/section-state";

const sectionState = provideSectionState(sectionStateAdapter);
```

Or:

```ts
import { provideAuth } from "./index/ports/auth";
import { useRivetAuth } from "./index/composables/useRivetAuth";

const auth = provideAuth(useRivetAuth());
```

### Components

Leaf components are presentational. Feature-container components may consume
an already-provided context when that keeps orchestration out of leaves; name
and place them so their role is obvious.

They may:

- render data
- hold local UI interaction
- emit events
- consume already-provided capabilities
- import pure `logic/` helpers directly

They should not:

- call generated clients directly
- own workflow orchestration
- construct infrastructure dependencies
- reach around the page composition root

### Rivet Rules

Generated Rivet clients are already typed contracts.

Therefore:

- do not wrap Rivet behind ports by default
- do not create fake API service layers unless there is a genuine need
- bootstrap Rivet once at the app boundary
- call generated clients directly inside the composable that implements the capability when appropriate
- the generated client and its DTO types come from the contracts package: `rivet/client-package.md`

Good:

- `useRivetAuth()` calls generated session client
- `useSubmissionMessages()` calls generated messaging endpoints directly

Bad:

- `MessagesApiPort` that mirrors generated methods one-for-one
- “service” wrappers that only rename generated methods

### When Not To Use This Pattern

Do not force the full page-colocated ports-and-adapters structure when the feature is tiny.

Skip ceremony when:

- the component is purely presentational
- the composable is already small and clear
- there is no real capability boundary
- no subtree wiring is needed

If something is trivial, keep it trivial.

### Failure Modes

Watch for these:

- ports around everything
- fake API abstraction over generated clients
- adapters with Vue imports
- composables importing adapters directly when the port seam should be used
- global stores used as a default transport for unrelated concerns
- promoting code to shared/global before it is actually shared
- re-export shims (`export { X } from "..."`) left behind after promotion — consumers should import from the promoted location directly
- page-local code prematurely moved into `app/features/...`
- product-owned cross-page capabilities erased into generic `app/shared/`
- `can…` / `available…` helpers that compare server status strings, timestamps,
  counters, version lists or roles to decide what the user may do (see
  `frontend/server-rules-stay-on-the-server.md`)
