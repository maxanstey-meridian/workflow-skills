## Sign 8: Flag type escapes

**Law:** Flag TypeScript `x as T`, `<T>x`, and `x!` that quiet the compiler (a house Law), `any`, `object`, or `dynamic` carrying values on any stack, `unknown` outside a parse boundary, C# `object?`, `Record<string, unknown>` or `Dictionary<string, object>` where keys are known, and reflection (`MethodInfo.Invoke` or `MakeGenericType`) where the caller already holds the static type (`coding/model-the-real-type-of-every-value.md`).

**When:** Reviewing type annotations, casts, and reflection; prove each finding by naming the real type the value has and where it comes from. Do not flag `as const`, `satisfies`, genuinely dynamic data (user-supplied key-value pairs or opaque JSON from an external API), or C# `= null!` and `default!` on EF entity and options properties (the framework's idiom).

Bad: Flagging `public string Name { get; set; } = null!;` on an EF entity, or leaving `response.data as FormDto` unflagged because it compiles.
Good: Flagging `response.data as FormDto` with the generated client's typed return value, and leaving `satisfies` and EF `= null!` unflagged.
