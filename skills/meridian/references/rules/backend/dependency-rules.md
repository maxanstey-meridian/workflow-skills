## Non-Negotiable Dependency Rules

These are the hard rules.

### Inside a module

- `Domain` depends on nothing outside itself
- `Application` may depend on `Domain`
- `Application` must not depend on `Infrastructure`
- `Infrastructure` implements `Application/Ports`
- interface/transport/controllers call application services or use cases only
- controllers and endpoint adapters never call, inject, inherit from, or store
  another controller; share the underlying Application capability instead

### Across modules

Modules must not depend on sibling internals: never import another module's
`Domain` or `Infrastructure`, query its tables, or reach into non-public
application types. Cross-module collaboration must name both ownership and
direction explicitly.

There are three valid integration shapes:

- **consumer-owned required port** — module A defines the narrow capability it
  needs; a host/integration adapter bridges that port to module B
- **provider-owned published contract** — module B deliberately exposes a
  stable command/query contract that sibling Application code or host/integration
  composition may call; Domain never consumes a sibling contract
- **shared kernel** — two or more modules genuinely co-own a small, stable
  concept; that concept lives in Common and changes only by joint agreement

Required ports do not move to Common merely because their implementation calls
another module. Published contracts do not expose a module's internal domain
model. Integration wiring at the host edge may depend on both sides; feature
modules depend only on the contract relevant to their side.

### Published contract closure

Published contract source is closed over published or genuinely shared types.
Files under `Modules/<Feature>/Contracts/` and top-level transport
`Contracts/<Feature>/` must not reference module Domain, Application,
Infrastructure, or presentation types. Move wire-facing enums, records, and
value shapes into the owning contract and map at the edge; C# `public`
accessibility does not make an internal domain type published language.

Provider-published module contracts may be consumed by Application,
integration, and transport contract code. Domain never consumes a sibling
contract. Top-level transport contracts still own their direct request and
response DTOs rather than using Application commands, results, controller
types, or module contracts as route payload roots.

The reverse direction is closed too: a module's Contracts, Domain, Application
and Infrastructure never reference the top-level transport contracts
(`<App>.Contracts.*`), and no `global using` brings them in. The transport edge
(`Contracts/**/…TransportMapper` and the module-root presentation files:
controllers, endpoints, transport mappers, request validators, the module's
registration) maps to and from module types; module code never takes or
returns a wire DTO.

This is dependency inversion applied to module integration: the consumer owns
the shape of what it requires, while a provider owns the shape of what it
publishes. `Common` is not an owner-erasure mechanism.

**Module-merge heuristic**: if two modules repeatedly need each other's
internal concepts or require atomic changes to both models, the boundary is
probably false. Merge or redraw it rather than accumulating integration ports.
A "module" every other module needs but that owns no product capability is an
infrastructure concern wearing a module costume.
