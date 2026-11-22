## Put only cross-cutting code in Common

**Default:** Put only genuinely ownerless shared code in `Common/` or `shared/` — base error types, common middleware/filters, cross-module value types, and co-owned shared-kernel contracts; never feature logic or boundary workarounds.

**When:** Adding code to `Common/` or `shared/` on .NET or TypeScript backends.

Bad: `Common/FormHelpers.cs` holding form-naming rules.
Good: Placing those rules in `Modules/Forms/Domain/`.
