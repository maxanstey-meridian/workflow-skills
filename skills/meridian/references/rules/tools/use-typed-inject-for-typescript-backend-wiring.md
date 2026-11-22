## Use typed-inject for TypeScript backend wiring

**Tooling:** Use `typed-inject` for explicit runtime wiring: list dependencies in `public static inject = [...] as const`, keyed by string and typed by port.

**When:** TypeScript backends and local hosts without Nest-style framework injection (under Nest, the abstract-class port is the token). It keeps wiring explicit — never use it to hide boundaries or restore magic resolution.

Bad: A class looking up `clock` in a service locator.
Good:
```ts
export class TickPet {
  public static inject = ["clock", "petEffects"] as const;
  public constructor(
    private readonly clock: Clock,
    private readonly petEffects: PetEffects,
  ) {}
}
```

Links: [a use case with `static inject`, list-quotes.ts](https://github.com/maxanstey-meridian/rivet-ts/blob/main/templates/example/apps/api/src/modules/quotes/application/list-quotes.ts), [the host's startup file, composition.ts](https://github.com/maxanstey-meridian/rivet-ts/blob/main/templates/example/apps/api/src/composition.ts)
