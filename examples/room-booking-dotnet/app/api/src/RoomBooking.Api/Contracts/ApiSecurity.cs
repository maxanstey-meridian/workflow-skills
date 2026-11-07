using Rivet;

[assembly: RivetSecurityScheme(
    "bearer",
    "http",
    scheme: "bearer",
    description: "Development auth: the bearer token is a seeded user id."
)]
[assembly: RivetGlobalSecurity(0)]
[assembly: RivetGlobalSecurityScheme(0, "bearer", new string[0])]
