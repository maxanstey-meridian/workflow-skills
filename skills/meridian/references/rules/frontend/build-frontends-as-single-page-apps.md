## Build frontends as single-page apps

**Default:** Build a frontend as a single-page app and do not use server-rendering idioms.

**When:** Nuxt frontends: `ssr: false`. Hydration-aware `useAsyncData` patterns and server components are not used, and no rule here rules on them.

Bad: `ssr: true` with `useAsyncData` shaped for hydration.
Good: `ssr: false` and a composable that loads on mount.
