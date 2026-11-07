## Common Failure Modes

Watch for these:

1. Shared dumping ground
- `Common/` or `shared/` starts absorbing feature logic

2. Cross-module leakage
- one module imports another module’s infrastructure or internal application types

3. Fake repositories everywhere
- ports with no real variability or boundary value

4. Application logic hiding in controllers
- transport layer becomes orchestration layer

5. Domain logic hiding in use cases
- business rules are inline `if/else` branches instead of explicit domain decisions
- the same guard is written in several use cases, in slightly different shapes

6. Rules re-derived by callers
- the UI or a second use case re-implements a guard instead of calling the
  decision or reading its projection; the copies drift and the UI offers
  actions the server refuses

7. Package/project sprawl
- splitting modules into separate packages before a real runtime or deployment boundary exists
