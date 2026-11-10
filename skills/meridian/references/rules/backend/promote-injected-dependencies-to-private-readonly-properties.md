## Promote injected dependencies to private readonly properties

**Preference:** Use constructor property promotion for injected dependencies, `private readonly` by default and `protected readonly` only for a real inheritance reason.

**When:** TypeScript backend classes that receive injected dependencies.

Bad: `private clock: Clock; constructor(clock: Clock) { this.clock = clock; }`
Good: `constructor(private readonly clock: Clock) {}`
