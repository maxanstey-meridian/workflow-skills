## Never reach into another module's internals

**Law:** A module (one feature's folder under `Modules/` or `src/modules/`) never imports a sibling's Domain or Infrastructure, queries its tables, entities, or DbSets, or uses its non-public Application types.

**When:** Any code inside a module, on .NET or TypeScript.

Bad: the Cases module joining the CaseTypes module's `CaseTypes` table.
Good: the Cases module calling the CaseTypes module's published query.
