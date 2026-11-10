## Provide the implementation, not a repacked object

**Law:** A composition root (the app shell, a layout, or a page) passes the implementation straight to `provideX`; it never unpacks a composable and repacks chosen members into a port-shaped object (a port is the type that names what a subtree needs), nor adds getters to hand out pieces, and a page that needs more of a capability widens the port.

**When:** Vue and Nuxt composition roots. If direct provision is impossible because the page gathers state from several unrelated composables, treat that as a sign that ownership is unclear, that the port republishes what it does not own, or that a dependent composable should inject those capabilities itself.

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
