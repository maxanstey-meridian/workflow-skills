## Redraw a boundary that needs atomic cross-module changes

**Default:** When two modules (feature folders under `Modules/` or `src/modules/`) keep needing each other's internal concepts, or one invariant keeps needing atomic changes to both, merge them or redraw the boundary before adding integration ports (the consumer's own types naming a capability it needs) or coordination.

**When:** Any design that adds another integration port, or any coordination, between two modules that already work together through a port or a contract.

Bad: a saga (a multi-step coordinator) and two ports so `Orders` and `OrderLines` stay consistent.
Good: one `Orders` module.
