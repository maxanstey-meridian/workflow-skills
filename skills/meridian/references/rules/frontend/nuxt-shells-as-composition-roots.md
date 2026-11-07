## Nuxt Shells As Composition Roots

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
