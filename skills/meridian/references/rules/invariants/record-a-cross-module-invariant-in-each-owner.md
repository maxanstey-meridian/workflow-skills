## Record a cross-module invariant in each owner

**Default:** A rule that spans modules is recorded by each module that enforces part of it, with each entry naming its own `owner` boundary and listing the other modules' rule IDs in `related`.

**When:** An invariant enforced in more than one module, when writing its entries in those modules' `invariants.yaml` files.

Bad: One entry in the forms module claiming the whole "submission closes when the form is withdrawn" rule.
Good: An entry in forms and one in submissions, each naming its own `owner` and listing the other's ID under `related`.
