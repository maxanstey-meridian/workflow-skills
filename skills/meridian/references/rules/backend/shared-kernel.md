## Shared Kernel

Code in `shared/` or `Common/` belongs to no module; these rules keep it that way.

### Shared/common rule

Shared locations exist for genuine cross-cutting concerns only.

Use them for:

- base error types
- common middleware/filters
- shared value types that are truly cross-module
- deliberately shared-kernel contracts

Do not use shared/common as:

- a dumping ground
- a backdoor around module boundaries
- a place to hide poorly named feature logic

### Common/module shadowing

`Common/<Feature>/` must not mirror an existing `Modules/<Feature>/`. That
topology erases the feature's ownership even when several modules consume the
types. Organize genuine shared-kernel or host concerns by their shared role;
keep feature-owned published language with the feature.
