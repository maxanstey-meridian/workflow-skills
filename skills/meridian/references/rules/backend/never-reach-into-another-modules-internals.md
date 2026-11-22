## Never reach into another module's internals

**Law:** A module never imports a sibling's Domain or Infrastructure, queries its tables, entities, or DbSets, or uses its non-public Application types.

**When:** Any code inside a .NET or TypeScript module.

Bad: `Cases` joining `CaseTypes`'s `CaseTypes` table.
Good: `Cases` calling `CaseTypes`'s published query.
