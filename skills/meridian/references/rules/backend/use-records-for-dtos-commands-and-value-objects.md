## Use records for DTOs, commands, and value objects

**Default:** Use a `record` for DTOs, commands, results, and value objects; an EF entity may be a `sealed class`.

**When:** C# code.

Bad: `public sealed class CreateFormCommand { public string Name { get; set; } }`
Good: `public sealed record CreateFormCommand(string Name);`
