## Publish actions one by one with RivetEndpoint

**Tooling:** Mark each published controller action with `[RivetEndpoint]` rather than putting `[RivetClient]` on the controller (which publishes every HTTP action).

**When:** .NET controllers published through Rivet.

Bad: `[RivetClient]` on `FormsController`, accidentally publishing an internal debug action.
Good: `[RivetEndpoint]` on only the three public actions.
