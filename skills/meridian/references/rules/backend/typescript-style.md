## TypeScript style

- strict typing
- narrow ports as abstract classes with private constructors
- concrete adapters `implement` ports
- prefer constructor property promotion for injected dependencies
- explicit provider wiring
- no hidden framework abstraction layers

Example:

```ts
export class TickPet {
  public static inject = [
    "clock",
    "getWindowTitle",
    "petEffects",
    "petStateMachine",
    "petStatePersistence",
  ] as const;

  public constructor(
    private readonly clock: Clock,
    private readonly getWindowTitle: () => string | null,
    private readonly petEffects: PetEffects,
    private readonly petStateMachine: PetStateMachine,
    private readonly petStatePersistence: PetStatePersistence,
  ) {}

  public async execute(input: TickPetInput): Promise<PetState> {
    // ...
  }
}
```

Prefer:

- `public static inject = [...] as const` for `typed-inject`-assembled classes
- constructor property promotion for long-lived injected dependencies
- `private readonly` by default
- `protected readonly` only when there is a real inheritance reason

Avoid:

- constructor args assigned manually to fields for no reason
- grabbing dependencies from service locators inside methods
- mutable injected dependency fields
- barrel-heavy indirection that hides provenance
- framework or transport details in domain/application

Production source reads environment only in root configuration/bootstrap owners:
`config.ts`, `config.mts`, `config.cts`, `config/**`, `bootstrap.ts`,
`bootstrap.mts`, `bootstrap.cts`, or `bootstrap/**`, each optionally under
`src/`. In a workspace monorepo, each package root (directory with its own
`package.json`) is treated as a project root for owner matching — so
`server/src/config.ts` is an owner just as `src/config.ts` is in a
single-package repo. Module-local folders with those names are not owners.
Build-tool config files (`vite.config.ts`, `nuxt.config.ts`, `vitest.config.ts`,
etc. — any `*.config.{ts,mts,cts}` at a package root) are build-time tooling,
not production runtime source. Outside those roots, do not read `process.env`,
`globalThis.process.env`, `Bun.env`, `Deno.env`, or import named `env` from
`process`/`node:process`; inject the validated config object.
