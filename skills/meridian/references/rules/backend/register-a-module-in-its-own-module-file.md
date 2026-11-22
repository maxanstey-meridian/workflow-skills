## Register a module in its own module file

**Default:** Register each module's dependencies explicitly in its own module file; the host supplies only environment-specific overrides.

**When:** `<Feature>Module.cs` (.NET) or `<feature>.module.ts` (TypeScript).

Bad: Registering every module's services in one long `Program.cs`.
Good: `builder.Services.AddFormsModule()` delegating to `FormsModule.cs`.

Links: [a TypeScript module file, quotes.module.ts](https://github.com/maxanstey-meridian/rivet-ts/blob/main/templates/example/apps/api/src/modules/quotes/quotes.module.ts)
