## TypeScript / Vue / Nuxt

### Default stack

- package manager: `pnpm`
- framework: `Nuxt 4` + `Vue 3`
- language: `TypeScript`
- typecheck: `vue-tsc`
- UI layer: `@nuxt/ui`
- utility layer: `@vueuse/core`
- validation/schema: `zod` when needed
- tests: `vitest` + `@vue/test-utils` + `happy-dom`
- e2e: `playwright` where warranted

### Dependency injection

For explicit runtime DI in TypeScript backends or local hosts:

- prefer `typed-inject`

Use it when:

- you want explicit composition without Nest-style framework DI
- you are bootstrapping a local API/runtime host
- you want typed assembly with obvious provenance

Do not use it to hide boundaries or to recreate a magic container culture.

### Linting and formatting

Default bias:

- prefer `oxlint` over `eslint`
- prefer `oxfmt` over Prettier
- use `eslint` only where Vue/Nuxt support is still needed

Current practical rule:

- `ox*` does the general JS/TS lint/format work
- `eslint` remains for Vue/Nuxt-specific linting because `oxlint` does not cover that fully yet

So the intended stack is:

- `oxlint`
- `oxfmt`
- `eslint` + `@nuxt/eslint` only as the Vue/Nuxt layer on top

**Base configs.** The base config files live in
[plumb's `configs/` folder](https://github.com/maxanstey-meridian/plumb/tree/main/configs),
and Plumb enforces them (MER-TO-002/005): every TS repo carries
`.oxlintrc.json` and `.oxfmtrc.json` containing *at least* the base settings,
with the base values — repos extend the base (extra rules,
ignorePatterns, internalPattern aliases), never contradict it. Apps with `.vue`
files additionally carry the `@nuxt/eslint` layer; apps without `.vue` files
carry no eslint at all.

**Comment width (preference).** `oxfmt` does not wrap comments, so keep
comment-only lines within the `.oxfmtrc.json` `printWidth` by hand; a single
unbreakable token (URL, path) may overflow, and so may a tool directive
(`// eslint-disable-next-line … -- reason`, `// @ts-expect-error …`), which its
tool reads from that one line.

### Generated code

Generated output is read-only and must be excluded by every applicable linter.
Each generated tree is covered by the nearest `.oxlintrc.json`
`ignorePatterns`; when an ESLint flat config applies to that tree, its exported
config also includes a matching `ignores` entry.

### TS examples

Base configs (the enforced minimum):

- [oxlintrc.json](https://github.com/maxanstey-meridian/plumb/blob/main/configs/oxlintrc.json)
- [oxfmtrc.json](https://github.com/maxanstey-meridian/plumb/blob/main/configs/oxfmtrc.json)

Nuxt + `oxlint` + `eslint` integration:

```js
// apps/ui/eslint.config.mjs — eslint is only the Vue/Nuxt layer; oxlint does the rest.
// @nuxt/eslint writes ./.nuxt/eslint.config.mjs during `nuxt prepare`.
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  name: "project/vue-rules",
  rules: { "vue/multi-word-component-names": "off" },
}).append({ ignores: [".nuxt/**", ".output/**", "dist/**"] });
```

Typed DI / explicit assembly examples:

- [quotes.module.ts](https://github.com/maxanstey-meridian/rivet-ts/blob/main/templates/example/apps/api/src/modules/quotes/quotes.module.ts):
  the module owns its `createInjector()` wiring; the root supplies only the
  adapters that differ between environments
- [list-quotes.ts](https://github.com/maxanstey-meridian/rivet-ts/blob/main/templates/example/apps/api/src/modules/quotes/application/list-quotes.ts):
  a use case with `static inject` and an abstract-class port
- [composition.ts](https://github.com/maxanstey-meridian/rivet-ts/blob/main/templates/example/apps/api/src/composition.ts):
  the composition root

Concrete `typed-inject` class shape: see `backend/typescript-style.md`.

### Notes

- Prettier is not the current default in newer repos.
- Older repos may still contain heavier ESLint/Prettier/plugin stacks; do not treat those as the preferred baseline.
