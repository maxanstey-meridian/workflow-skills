## Provide implementations, not projections

**Law:** A composition root should not unpack a composable and manually repack selected
members into a port-shaped object. Pass the implementation directly to `provideX`;
the preserved concrete return type lets the root retain persistence and orchestration
capabilities while injected consumers receive only the narrow port. A page that needs more of a capability widens its port; it doesn't unpack it, repack it, or add getters to hand out pieces.

```ts
// Wrong: the page has become a hand-written adapter.
const effects = useFormEffects();

provideFieldEffects({
  effects: effects.effects,
  fields: sections.allFields,
  connectors: discovery.connectors,
  add: effects.add,
  remove: effects.removeEffect,
});

// Right: provide the owned implementation directly.
const effects = provideFieldEffects(useFormEffects());
```

This keeps pages as wiring shells rather than dependency assemblers. If direct
provision is impossible because a page must gather and forward state from several
unrelated composables, treat that as evidence that ownership is unclear, the port
republishes capabilities it does not own, or a dependent composable should inject
those capabilities itself.

Do not merely move that page-level assembly into a
`useFoo({ dependencyA, dependencyB, ... })` options bag. Runtime collaborators
should normally be obtained through their typed injected capabilities; constructor
arguments are reserved for identity and genuine per-instance configuration.
