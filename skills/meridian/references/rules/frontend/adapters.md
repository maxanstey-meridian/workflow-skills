## Adapters

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
