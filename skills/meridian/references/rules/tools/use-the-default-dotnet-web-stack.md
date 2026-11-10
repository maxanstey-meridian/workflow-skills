## Use the default dotnet web stack

**Tooling:** For a .NET web API use ASP.NET Core, `Rivet.Attributes` for the transport contract (the API's route definitions and wire types), and PostgreSQL through `Npgsql` and `Npgsql.EntityFrameworkCore.PostgreSQL`.

**When:** A new .NET web API.

Bad: a new API on SQL Server with hand-written OpenAPI attributes.
Good: a new API on ASP.NET Core, with `Rivet.Attributes` for the transport contract and PostgreSQL.
