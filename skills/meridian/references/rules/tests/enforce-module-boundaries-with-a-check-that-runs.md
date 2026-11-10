## Enforce module boundaries with a check that runs

**Default:** Where the code depends on module boundaries (one feature's folder under `Modules/` must not reach into another's), enforce them with a check that runs in the build or in CI, not with a document.

**When:** Any backend with modules. .NET: every project that owns a `Modules/` tree is covered by architecture tests that execute ArchUnitNET or NetArchTest rules, or by CI, a task, or a script that runs Plumb; a package with no execution, or a declared rule that is never checked, does not count. TypeScript: lint import-boundary rules, dependency-cruiser, architecture tests, or real workspace package boundaries. The checks cover: Domain depends on neither Application nor Infrastructure, Application not on Infrastructure, no module on a sibling's internals, module dependencies running one way against the repo's claims, and a dependency between modules only through a port the consumer owns (a port is the application-owned type that names a capability), a published contract the provider owns (the types a module deliberately exposes to other modules), or a shared kernel (a small concept two or more modules own together).

Bad: the ArchUnitNET package referenced with no test that runs a rule.
Good: an architecture test that fails `dotnet test` when a module imports a sibling's Domain.

Links: [Plumb](https://github.com/maxanstey-meridian/plumb)
