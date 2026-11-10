## Use EF Core by default and Dapper for projections

**Tooling:** Use EF Core for aggregate persistence and ordinary relational work, Dapper for deliberate projections (read shapes a query returns) or SQL-heavy paths, and raw ADO.NET only when the lower-level control itself is needed.

**When:** .NET data access.

Bad: a hand-written `NpgsqlCommand` for a simple insert.
Good: `db.Forms.Add(form)` through EF Core.
