## Validate at the layer that owns the contract

**Default:** Validate each thing once, where its contract is owned: parsing and binding at the transport edge (controllers, endpoints, and the mappers beside them), command shape and meaning in Application, state invariants in Domain, and uniqueness and referential rules in Application backed by database constraints.

**When:** .NET and TypeScript backends. A check that is only about HTTP may stay at the edge, while a command that HTTP, queues, jobs, and tests can all send owns its own validation; never repeat one rule in both places.

Bad: "Name is required" checked in the request validator and again in the command validator.
Good: "Name is required" checked in the command validator only.
