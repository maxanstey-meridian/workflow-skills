## Configure the Rivet client once at startup

**Tooling:** Call `configureRivet` once at app startup.

**When:** Frontends calling a Rivet API.

Bad: Calling `configureRivet({ baseUrl })` inside three composables.
Good: Calling `configureRivet({ baseUrl })` once in app startup code.
