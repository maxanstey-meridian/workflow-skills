## Build one modular monolith first

**Default:** Start a backend as one project or one package split into modules (a module is one feature's folder under `Modules/` or `src/modules/`), and do not start with flat service folders, a giant `common/services`, many tiny packages or projects, or microservice boundaries with no real runtime or deployment boundary.

**When:** A new backend, .NET or TypeScript, and any proposal to split one into packages or services.

Bad: `Forms.Api`, `Forms.Domain`, `Forms.Data`, and `Shared.Services` projects on day one.
Good: one `Api` project with `Modules/Forms/`.
