## Sign the dev user in with a development handler

**Default:** A development environment without real authentication gets a development authentication handler that signs the dev user in.

**When:** ASP.NET backends run locally without the real identity provider.

Bad: `if (!app.Environment.IsDevelopment()) endpoints.RequireAuthorization()`.
Good: A `DevAuthenticationHandler` registered in development, with `RequireAuthorization()` unconditional.
