## Keep Domain free of IO and frameworks

**Law:** Domain depends on nothing outside itself: no repositories, HTTP, database access, framework imports, SDK clients, logging, or a sibling module's published contract (the types it deliberately exposes to other modules).

**When:** Domain code in a module (one feature's folder under `Modules/` or `src/modules/`), on .NET or TypeScript; Domain decisions are values, and `ILogger<T>` belongs in Application and Infrastructure.

Bad: a Domain entity that takes `ILogger<Form>` and calls `DbContext`.
Good: the entity returns a value, and the use case logs and saves.
