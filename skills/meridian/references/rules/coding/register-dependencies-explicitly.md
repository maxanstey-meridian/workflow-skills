## Register dependencies explicitly

**Default:** Register and wire every dependency by name in code a reader can open; do not use assembly scanning, reflection conventions, or provider discovery.

**When:** Wherever dependencies are registered: `IServiceCollection` registration in .NET (validators included), provider wiring in a TypeScript backend.

Bad: `services.Scan(...)` or `AddValidatorsFromAssembly(...)`.
Good: One `services.AddScoped<CreateFormUseCase>()` line per type.
