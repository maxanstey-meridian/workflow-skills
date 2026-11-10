## Use a dictionary only for dynamic keys

**Default:** Use `Dictionary` or `Record<string, unknown>` only for data whose keys are not known at compile time; when the keys are known, use a record or a named type.

**When:** C# and TypeScript. Dynamic data means user-provided key-value pairs, JSON from an external API, or a config map with unknown keys.

Bad: `Record<string, unknown>` for settings whose three keys are fixed.
Good: `type Settings = { theme: Theme; locale: string; compact: boolean }`.
