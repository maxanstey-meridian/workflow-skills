## Keep entity mapping in the owning module

**Default:** Each module (one feature's folder under `Modules/`) configures its own entities in its own Infrastructure; a module never configures another's entities, and mapping is never centralised beside the DbContext.

**When:** .NET with EF Core. One host-level DbContext is fine as the persistence root, and migrations are host-level; `IEntityTypeConfiguration<T>` classes live in `Modules/<Feature>/Infrastructure/Persistence/`.

Bad: Every entity configured in `AppDbContext.OnModelCreating`.
Good: `FormConfiguration : IEntityTypeConfiguration<Form>` in `Modules/Forms/Infrastructure/Persistence/`.
