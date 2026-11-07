## Validation

Validate at the boundary that owns the contract:

- transport parsing and binding → transport edge
- command shape and semantic validity → Application, especially when HTTP,
  queues, jobs, and tests can all invoke the same command
- state invariants → Domain
- uniqueness and referential rules → Application orchestration backed by
  authoritative database constraints
- authorization → normally an Application policy using actor and resource
  context; Domain only when permission is intrinsic to the state transition

FluentValidation is the default for request/command shape validation. Register
validators explicitly; no assembly scanning. Do not duplicate the same rule in
transport and Application: HTTP-only request validation may stay at the edge,
while reusable commands own reusable validation.

### Validation error codes

Every FluentValidation validator that can produce a failure declares an
explicit `.WithErrorCode(...)` for that validator. Error codes are machine-facing
contract values; a message or FluentValidation's validator-name default is not
a stable API code. In a chain with several validators, each validator owns its
own code.

Delegation through `SetValidator` and `ChildRules` does not add a failure at the
outer call site; the delegated or nested rules own their codes. Reusable custom
validator extensions likewise own the codes they produce. `Custom` callbacks
must set codes on failures themselves, but that callback behavior is not
mechanically inferred from the call site.
