## Enforcement

Document the rules, then enforce them.

### .NET

Prefer architecture tests for:

- domain not depending on application/infrastructure
- application not depending on infrastructure
- modules not referencing sibling Domain/Infrastructure or non-public
  Application types
- required ports, published contracts, and shared-kernel dependencies following
  their declared ownership

### TypeScript

Use whatever is lightest and enforceable:

- lint/import-boundary rules
- dependency-cruiser
- architectural tests
- workspace package boundaries where they are real

The point is not tooling purity. The point is to stop the drift.
