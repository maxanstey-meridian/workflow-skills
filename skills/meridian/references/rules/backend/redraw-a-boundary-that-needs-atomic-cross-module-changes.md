## Redraw a boundary that needs atomic cross-module changes

**Default:** When two modules repeatedly need each other's internals or atomic cross-module changes for one invariant, merge them or redraw the boundary instead of adding integration ports or coordination.

**When:** Before adding another integration port or saga between modules that already collaborate.

Bad: A saga and two ports to keep `Orders` and `OrderLines` consistent.
Good: One `Orders` module.
