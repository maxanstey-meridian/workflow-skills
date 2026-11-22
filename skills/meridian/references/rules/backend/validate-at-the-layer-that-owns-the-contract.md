## Validate at the layer that owns the contract

**Default:** Validate each rule once at its contract owner: parsing/binding at the transport edge, command shape/meaning in Application, state invariants in Domain, and uniqueness/referential rules in Application backed by DB constraints.

**When:** .NET and TypeScript backends. HTTP-only checks stay at the edge; commands reachable from HTTP, queues, jobs, or tests own their own validation — never duplicate one rule in both places.

Bad: Checking "Name is required" in both the request validator and the command validator.
Good: Checking "Name is required" in the command validator only.
