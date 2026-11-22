## Keep entity mapping in the owning module

**Default:** Configure each module's entities inside its own Infrastructure (`Modules/<Feature>/Infrastructure/Persistence/`) — never configure another module's entities or centralise mappings beside `DbContext`.

**When:** .NET with EF Core (a single host-level `DbContext` and host-level migrations are fine).

Bad: Configuring every entity in `AppDbContext.OnModelCreating`.
Good: `FormConfiguration : IEntityTypeConfiguration<Form>` in `Modules/Forms/Infrastructure/Persistence/`.
