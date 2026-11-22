## Enforce module boundaries with a check that runs

**Default:** Enforce module boundaries (`Modules/` isolation) with a check that runs in the build or CI, not a document.

**When:** Any modular backend. .NET: every project owning `Modules/` needs executed ArchUnitNET/NetArchTest rules or a CI/task/script running Plumb (an unexecuted package or rule does not count). TypeScript: lint import-boundary rules, dependency-cruiser, architecture tests, or workspace package boundaries. Checks must cover: Domain depends on neither Application nor Infrastructure; Application not on Infrastructure; no module imports a sibling's internals; module dependencies run one way as claimed; cross-module dependencies use only a consumer-owned port, a provider-owned published contract, or a shared kernel.

Bad: Referencing ArchUnitNET with no test executing a rule.
Good: An architecture test that fails `dotnet test` when a module imports a sibling's Domain.

Links: [Plumb](https://github.com/maxanstey-meridian/plumb)
