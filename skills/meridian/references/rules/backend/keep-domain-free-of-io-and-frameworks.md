## Keep Domain free of IO and frameworks

**Law:** Domain depends on nothing outside itself: no repositories, HTTP, DB access, framework imports, SDKs, logging, or sibling modules' published contracts.

**When:** Domain code in any .NET or TypeScript module (Domain returns values; `ILogger<T>` belongs in Application and Infrastructure).

Bad: A Domain entity taking `ILogger<Form>` and calling `DbContext`.
Good: The entity returning a value while the use case logs and saves.
