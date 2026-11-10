## Publish actions one by one with RivetEndpoint

**Tooling:** Mark each published controller action with `[RivetEndpoint]` rather than putting `[RivetClient]` on the controller, which publishes every HTTP action in it.

**When:** .NET controllers published through Rivet, which reads C# and emits the OpenAPI document and typed terminals for each declared response.

Bad: `[RivetClient]` on `FormsController`, which also publishes an internal debug action.
Good: `[RivetEndpoint]` on each of the three public actions only.
