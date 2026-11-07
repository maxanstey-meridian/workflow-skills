## Promotion

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
