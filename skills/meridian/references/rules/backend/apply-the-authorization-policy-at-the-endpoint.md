## Apply the authorization policy at the endpoint

**Law:** Apply authentication and the named authorisation policy unconditionally at the endpoint; make resource- or state-dependent decisions in the use case, never in a controller.

**When:** Every endpoint. ASP.NET: `[Authorize]`, `AuthorizeFilter` in `MvcOptions.Filters`, `.RequireAuthorization()`, or a fallback policy. OpenAPI security declarations enforce nothing; handler authorisation does.

Bad: `if (settings.AuthEnabled) group.RequireAuthorization("Editors")`, with ownership checked in the controller.
Good: `.RequireAuthorization("Editors")` unconditionally, and ownership checked in the use case.
