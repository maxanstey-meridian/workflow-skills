## Use typed-inject for TypeScript backend wiring

**Tooling:** Use `typed-inject` for explicit runtime wiring: each class lists its dependencies in `public static inject = [...] as const`, keyed by string and typed by the port (the type that names a capability the class needs).

**When:** TypeScript backends and local hosts that want explicit assembly without Nest-style framework injection; under Nest, the abstract-class port is the token instead. It makes wiring explicit; it is not a way to hide boundaries or to bring back a container that resolves things by magic.

Bad: a class whose method looks `clock` up in a service locator.
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
