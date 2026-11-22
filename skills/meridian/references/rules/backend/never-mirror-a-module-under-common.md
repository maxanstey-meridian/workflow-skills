## Never mirror a module under Common

**Default:** Never mirror an existing module under `Common/<Feature>/`, even when multiple modules consume its types; organise shared code by role and keep feature-published types inside the feature.

**When:** Adding files to `Common/` or `shared/` on .NET or TypeScript backends.

Bad: `Common/Forms/FormStatus.cs` beside `Modules/Forms/`.
Good: `Modules/Forms/Contracts/FormStatus.cs`.
