## Generalise the existing path instead of adding a parallel one

**Law:** Before adding a new implementation beside an existing one, check whether the old path is just a simpler case of the new requirement — if it is, widen the existing path and delete the special-case version rather than maintaining both.

**When:** Adding a new variant, mode, or capability to a codebase that already handles a narrower version of the same job.

Bad: Duplicating a query or service pipeline for a new variant (such as "with relations" or "admin") beside the original one, copying a create form into a separate edit form, or adding a cycle-safe walker beside a flat-chain walker and leaving both in place.
Good: Widening the existing query/service pipeline so the original case is the simpler input, widening the form to handle both create and edit, or replacing the flat-chain walker with the cycle-safe one.
