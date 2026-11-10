## Inject dependencies through the constructor

**Default:** Domain and Application receive their dependencies as explicit constructor parameters and never take the service provider, and on a TypeScript backend no class fetches a dependency from a locator inside a method.

**When:** .NET (`System.IServiceProvider`) and TypeScript backends. Only the code that assembles the application resolves dependencies.

Bad: A use case taking `IServiceProvider` and calling `GetRequiredService<FormRepository>()`.
Good: A use case taking `FormRepository` in its constructor.
