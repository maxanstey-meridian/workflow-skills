## Use turbo for a monorepo's task graph

**Tooling:** In a monorepo, use `turbo` for the task graph and caching.

**When:** A repo with more than one workspace package.

Bad: a root script that runs every package's build in a hand-written order.
Good: `turbo run build`, with the dependencies between packages declared in the turbo task graph.
