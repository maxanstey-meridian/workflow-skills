## Use pnpm as the package manager

**Tooling:** Use `pnpm` as the package manager.

**When:** Every JavaScript or TypeScript repo, monorepos included.

Bad: a repo installed with `npm install`, with a `package-lock.json` beside its `package.json`.
Good: a repo installed with `pnpm install`, with a `pnpm-lock.yaml`.
