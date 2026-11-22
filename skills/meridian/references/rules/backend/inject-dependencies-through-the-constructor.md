## Inject dependencies through the constructor

**Default:** Pass Domain and Application dependencies as explicit constructor parameters — never inject `IServiceProvider` or pull dependencies from a locator inside a method.

**When:** .NET and TypeScript backends (only the composition root resolves dependencies).

Bad: A use case injecting `IServiceProvider` and calling `GetRequiredService<FormRepository>()`.
Good: A use case taking `FormRepository` in its constructor.
