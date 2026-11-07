## Core Principle

Frontends are SPAs: assume `ssr: false` throughout. SSR idioms (hydration-aware
`useAsyncData` patterns, server components) are not house style, and nothing in
these rules should be read as ruling on them.

Keep views dumb and dependencies explicit.

The point of page-colocated ports and adapters is not “do DI on the frontend”.

The point is:

- rendering stays in views
- pure logic stays pure
- framework code stays at the edge
- capability wiring happens once in `app.vue`, a layout, or a page
- runtime seams are explicit instead of ambient

`provide` / `inject` is just the cleanest Vue mechanism for expressing that boundary.
