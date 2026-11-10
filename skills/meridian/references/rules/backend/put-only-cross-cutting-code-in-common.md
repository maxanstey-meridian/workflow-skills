## Put only cross-cutting code in Common

**Default:** `Common/` or `shared/` holds only shared code (code no single feature owns): base error types, common middleware and filters, value types that are truly cross-module, and deliberately co-owned shared-kernel contracts (a small concept two or more modules own together); never feature logic or a way round a module boundary (a module is one feature's folder under `Modules/` or `src/modules/`).

**When:** .NET and TypeScript backends, when adding code to `Common/` or `shared/`.

Bad: `Common/FormHelpers.cs` holding form-naming rules.
Good: the rules in `Modules/Forms/Domain/`.
