# Tools

## Purpose

Use this when choosing tooling for Meridian projects or when checking whether a repo is aligned with current defaults.

This file is about **tool choices and config defaults**, not architecture structure.

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

Concrete `typed-inject` class shape: see `backend-pa-vsa.md` "TypeScript style".

### Notes

- Prettier is not the current default in newer repos.
- Older repos may still contain heavier ESLint/Prettier/plugin stacks; do not treat those as the preferred Meridian baseline.

## .NET

### Default stack

- SDK pinned with `global.json`
- pin to `.NET 10`
- set `rollForward` to `latestFeature`
- nullable enabled
- implicit usings enabled
- built-in .NET analyzers enabled
- `.editorconfig` as the main style/analyzer policy source

### Web/API defaults

- ASP.NET Core
- `FluentValidation`
- `FluentResults` for ordinary Application result flows; not Domain outcomes
- `Rivet.Attributes`
- EF Core when persistence is relational
- PostgreSQL via `Npgsql` / `Npgsql.EntityFrameworkCore.PostgreSQL`

### Testing defaults

- `xUnit`
- `FluentAssertions` 7.x (8+ needs a paid licence for commercial use)
- `Microsoft.AspNetCore.Mvc.Testing`
- `Testcontainers`
- `Respawn`
- `ArchUnitNET`

Mocks:

- `NSubstitute` is available
- but it is not the testing philosophy default

### Formatting and analyzers

Current rule (enforced by plumb MER-TO-012/014):

- `CSharpier` is part of the formatting workflow — wired via a dotnet tool
  manifest (`.config/dotnet-tools.json`) or `CSharpier.MsBuild`; it is
  deliberately config-free, so no style file
- `.editorconfig` is the main formatting/style/analyzer authority — the
  canonical file is
  [editorconfig.dotnet](https://github.com/maxanstey-meridian/plumb/blob/main/configs/editorconfig.dotnet);
  repos contain at least its settings (tightening a severity is fine,
  diverging is not)
- analyzers should be enabled in project files (`EnforceCodeStyleInBuild` or
  `AnalysisLevel` in the csproj or `Directory.Build.props`)

So the real sources today are:

- the formatter command in repo workflows
- the canonical `.editorconfig` (plumb `configs/`)
- analyzer settings in `.csproj`
- SDK pinning in `global.json`

If a repo adds a `CSharpier` config file later, keep it aligned with `.editorconfig` and do not invent a second competing style doctrine.

**Comment width (preference).** `CSharpier` does not wrap comments, so keep
comment-only lines (`//`, `///`) within its print width by hand; a single
unbreakable token (URL, path) may overflow, and so may a tool directive
(`// ReSharper disable …`, `// csharpier-ignore …`), which its tool reads from
that one line.

### .NET examples

SDK pinning (`global.json`):

```json
{ "sdk": { "version": "10.0.100", "rollForward": "latestFeature" } }
```

Formatting workflow (`Taskfile.yml`):

```yaml
api:format:
  cmds:
    - dotnet format <Solution>.slnx analyzers --severity warn   # analyzer code fixes
    - dotnet csharpier format .                                   # then CSharpier owns layout
format:check:
  cmds:
    - dotnet csharpier check .
    - dotnet format <Solution>.slnx analyzers --severity warn --verify-no-changes
```

Style/analyzer baseline:

- [editorconfig.dotnet](https://github.com/maxanstey-meridian/plumb/blob/main/configs/editorconfig.dotnet) — the canonical file

Analyzer-enabled project setup:

- [Directory.Build.props](https://github.com/maxanstey-meridian/sluice/blob/main/Directory.Build.props)
  (sets `Nullable`, `ImplicitUsings`, `EnforceCodeStyleInBuild`, and `AnalysisLevel`)

## Workspace / orchestration

When the repo is a real monorepo:

- package manager: `pnpm`
- task graph/caching: `turbo`

For local orchestration:

- use `Task` / `go-task`
- prefer `Taskfile.yml` over ad hoc shell sprawl once commands become real workflow

## Summary

The current Meridian tools default is:

- TS/Nuxt: `pnpm`, `Nuxt 4`, `Vue 3`, `TypeScript`, `vue-tsc`, `@nuxt/ui`, `@vueuse/core`, `oxlint`, `oxfmt`, `eslint` only for Vue/Nuxt gaps, `typed-inject` for explicit runtime DI outside framework DI, `vitest`, `happy-dom`, `playwright`
- .NET: `.NET 10`, `global.json` with `rollForward: latestFeature`, `.editorconfig`, analyzers on, ASP.NET Core, `FluentValidation`, `Rivet.Attributes`, EF Core + Npgsql, `xUnit`, `FluentAssertions` 7.x, `Mvc.Testing`, `Testcontainers`, `Respawn`, `ArchUnitNET`

## Starting a new project

- rivet-ts's `scaffold` starts a new workspace:
  https://maxanstey-meridian.github.io/rivet-ts/getting-started
- Hono with `typed-inject` is the TS backend default (`backend-pa-vsa.md` "Purpose").
