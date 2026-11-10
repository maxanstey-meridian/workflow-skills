## Query existence without loading the entity

**Default:** When only existence is needed, issue an existence query (`ExistsAsync`, `AnyAsync`) instead of loading the entity.

**When:** C# data access.

Bad: `var form = await db.Forms.FirstOrDefaultAsync(f => f.Id == id); if (form != null)`
Good: `await db.Forms.AnyAsync(f => f.Id == id)`
