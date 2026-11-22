## Provide the implementation, not a repacked object

**Law:** Pass the implementation straight to `provideX` in a composition root; never unpack a composable into a repacked port-shaped object or add getter wrappers — widen the port if a page needs more.

**When:** Vue/Nuxt composition roots. If direct provision fails because the page merges unrelated composables, ownership is unclear, the port republishes foreign state, or a composable should inject its own collaborators.

Bad:
```ts
const effects = useFormEffects();
provideFieldEffects({
  effects: effects.effects,
  add: effects.add,
  remove: effects.removeEffect,
});
```
Good:
```ts
const effects = provideFieldEffects(useFormEffects());
```
