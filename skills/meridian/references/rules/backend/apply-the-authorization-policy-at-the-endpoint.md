## Apply the authorization policy at the endpoint

**Law:** The endpoint applies the authentication requirement and the named authorisation policy unconditionally, and a decision that needs the resource or its state is made in the use case, never in a controller.

**When:** Every endpoint. ASP.NET: `[Authorize]`, an `AuthorizeFilter` in `MvcOptions.Filters`, `.RequireAuthorization()`, or a fallback policy. A security declaration in the OpenAPI document enforces nothing; the handler's authorisation does.

Bad: `if (settings.AuthEnabled) group.RequireAuthorization("Editors")`, with the ownership check in the controller.
Good: `.RequireAuthorization("Editors")` always, and the ownership check in the use case.
