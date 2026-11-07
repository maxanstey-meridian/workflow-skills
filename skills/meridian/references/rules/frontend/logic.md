## Logic

`logic/` is pure TypeScript.

Hard rule:

- no imports from `vue`
- no imports from `nuxt`
- no imports from `#imports`
- no framework packages

Put in `logic/`:

- pure transforms
- calculations
- derivation rules
- immutable data shaping
- domain-ish UI rules that do not require reactivity

If something can be a pure function, put it here.

Components may import `logic/` directly because it has zero framework dependencies.
