## Call only use cases from a controller

**Law:** Controllers and endpoints call only Application use cases, services, or named queries — never orchestrating logic themselves.

**When:** Transport code in any .NET or TypeScript module.

Bad: A controller action loading two repositories, applying a rule, and saving.
Good: An action binding the request, calling `ExecuteAsync`, and mapping the result.
