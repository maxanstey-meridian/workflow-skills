## Build one modular monolith first

**Default:** Start a backend as one project or package split into feature modules (`Modules/` or `src/modules/`) — not flat service folders, a giant `common/services`, many tiny packages, or microservices without a real deployment boundary.

**When:** New .NET or TypeScript backends, or proposals to split one into packages or services.

Bad: `Forms.Api`, `Forms.Domain`, `Forms.Data`, and `Shared.Services` projects on day one.
Good: One `Api` project with `Modules/Forms/`.
