## Register use cases scoped and caches singleton

**Default:** Register use cases as Scoped, and caches and configuration as Singleton.

**When:** .NET dependency registration.

Bad: `services.AddSingleton<CreateFormUseCase>()`
Good: `services.AddScoped<CreateFormUseCase>()`
