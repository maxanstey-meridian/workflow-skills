## Keep wire-changing settings out of host JSON options

**Tooling:** Never register converters, naming policies, `DefaultIgnoreCondition`, or other wire-changing settings in host JSON options — Rivet's response writers throw.

**When:** .NET hosts serving Rivet routes.

Bad: `options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;`
Good: Host JSON options with no wire-changing settings.
