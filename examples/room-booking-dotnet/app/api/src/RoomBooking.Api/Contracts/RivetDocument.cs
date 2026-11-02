// Document-level OpenAPI security. Every business endpoint requires the devUser
// API key (the X-User-Email header the DevAuthHandler reads); GET /health is a
// literal bootstrap handler outside the contracts, so it carries no security.
[assembly: Rivet.RivetSecurityScheme(
    "devUser",
    "apiKey",
    parameterName: "X-User-Email",
    location: "header"
)]
[assembly: Rivet.RivetGlobalSecurity(0)]
[assembly: Rivet.RivetGlobalSecurityScheme(0, "devUser", new string[0])]
