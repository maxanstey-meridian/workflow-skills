## Never mirror a module under Common

**Default:** `Common/<Feature>/` never mirrors an existing module (one feature's folder, `Modules/<Feature>/` or `src/modules/<feature>/`), even when several modules consume the types; organise shared code by its shared role and keep the types a feature publishes to other modules with the feature.

**When:** .NET and TypeScript backends, when adding a folder or file to `Common/` or `shared/`.

Bad: `Common/Forms/FormStatus.cs` beside `Modules/Forms/`.
Good: `Modules/Forms/Contracts/FormStatus.cs`.
