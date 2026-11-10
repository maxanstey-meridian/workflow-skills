## Register a module in its own module file

**Default:** Each module (one feature's folder under `Modules/` or `src/modules/`) registers its own dependencies explicitly in its module file, and the host (the code that assembles the application) supplies only what differs between environments.

**When:** `<Feature>Module.cs` on .NET; `<feature>.module.ts` on a TypeScript backend.

Bad: every module's services registered in one long `Program.cs`.
Good: `builder.Services.AddFormsModule()` calling the registrations in `FormsModule.cs`.

Links: [a TypeScript module file, quotes.module.ts](https://github.com/maxanstey-meridian/rivet-ts/blob/main/templates/example/apps/api/src/modules/quotes/quotes.module.ts)
