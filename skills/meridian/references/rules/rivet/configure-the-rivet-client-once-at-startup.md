## Configure the Rivet client once at startup

**Tooling:** Configure the generated client once, where the app starts, with `configureRivet`.

**When:** Frontends that call a Rivet API (Rivet reads C# and emits the OpenAPI document).

Bad: `configureRivet({ baseUrl })` called inside three composables.
Good: `configureRivet({ baseUrl })` called once in the app's startup code.
