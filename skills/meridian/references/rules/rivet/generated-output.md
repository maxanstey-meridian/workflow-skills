## Generated Output

Generated Rivet output lives in a workspace package, `packages/contracts`,
consumed through its `exports` map (`@<scope>/contracts`, or a `./client`
subpath), never an in-app directory.

- generated code is read-only; exclude from lint
- regenerate via the repo's task convention (`task generate`, `pnpm rivet`, or `dotnet rivet --project ... --output ...`)
- commit regenerated output with the contract change that caused it
- `--verify` is the CI drift gate

Source of the standard facade: https://github.com/maxanstey-meridian/rivet-ts/blob/main/src/infrastructure/codegen/client-package-emitter.ts
