# Contributing

This file records how the routines are put together, why, and the one format for a rule.

## The run

You write a spec. The orchestrator starts subagents. A critic checks each round. The auditor writes the report. The orchestrator relays it word for word. There are no ledgers, and no checks of checks.

The orchestrator only dispatches. The auditor writes the report, so the orchestrator never marks its own run.

For `/go`, `/cycle`, and `/slop-hunt`, deterministic Node CLIs (`go-ctl.mjs`, `cycle-ctl.mjs`, and `slop-ctl.mjs`) own all state transitions, DAG scheduling, retry tracking, slice planning, area splitting, report validation, spec updates, and Markdown audit rendering. Each orchestrator `SKILL.md` is a thin pull-based dispatch loop: it calls `<routine>-ctl.mjs init` and then loops `<routine>-ctl.mjs next <run>`, executing the one YAML action block printed to stdout (`spawn`, `slice`, `review-scope`, `split`, `commit`, `gate`, `relay`, or `stop`). Every subagent writes a strict YAML report matching its schema in `lib/contracts/` or `lib/slop-ctl/` and self-validates it with `<cli>.mjs validate` before returning its path. Compaction recovery is a single call to `<cli>.mjs next <run>`.

## Layout

```
lib/
  package.json        shared TypeScript package (pnpm, TypeScript, Zod, esbuild, oxlint, oxfmt)
  contracts/          Zod schemas, spec/report validators, Markdown renderers, shared CLI commands, and spec-ctl entrypoint
  go-ctl/             /go pure state machine, brief generators, narrow I/O shell, and go-ctl entrypoint
  cycle-ctl/          /cycle slice planner, pure state machine, brief generators, git/I/O shell, and cycle-ctl entrypoint
  oracle-ledger/      /oracle pure schema, lint, JUnit, and merge core, narrow I/O shell, command handlers, and ledger entrypoint
  slop-ctl/           /slop-hunt YAML schemas, cross-validators, renderer, pure state machine, brief generators, narrow I/O/git shell, and slop-ctl entrypoint

skills/<routine>/
  SKILL.md            hand-written: the orchestrator's file (thin pull-based dispatch loop over *-ctl.mjs for /go, /cycle, and /slop-hunt)
  scripts/            generated esbuild bundles (spec-ctl.mjs, go-ctl.mjs, cycle-ctl.mjs, ledger.mjs, and slop-ctl.mjs) built from lib/, plus hand-written scripts that use $0, $1, and so on (which a SKILL.md can't hold)
  roles/              hand-written: the routine's roles under roles/<folder>/, and roles.list
  references/         generated: one file per role, and the rule files
  kinds/              oracle only: kinds.list, hand-written parts under kinds/<name>/, and generated kinds/<name>.md
  tracer/             hand-written, oracle only: a 3×3 ticket lifecycle decider and, beside it, an `__oracle__` case with its derived row script, for running the skill on

skills/meridian/references/
  rules/              hand-written: the rule library
  rules-<name>.list   which rules go in each rule file
  rules-<name>.md     generated: the rule files the skill's SKILL.md sends a reader to
```

## A routine owns its roles

A role is one subagent's whole job in one routine. Its parts live in subfolders under `skills/<routine>/roles/<folder>/` (flat `.md` files directly under `roles/` are refused). The part named `head.md` holds the role's brief, read order, procedure, and report shape and is exempt from the rule format check; every other `.md` file under `roles/<folder>/` is a rule in the five-part format. There is no top-level `roles/` folder: `/go`'s critic and `/cycle`'s critic are different jobs with the same name, and a shared file makes one of them override the other.

A part is shared only inside one routine, and only when every role takes it unchanged.

## Generated files

Role files and rule files are generated from colocated `.list` files by `node lib/build-roles/src/cli.ts`: the mechanism is the house rule `core/build-every-generated-file-from-its-list.md`. Generation is what lets a role share a part and still be one file to read. Never edit `references/` by hand. A routine's `references/` gets only the rule files its roles read. The build refuses orphans too: a rule in no list, a part no role uses, a flat `.md` file directly under `roles/`, and a generated file no line builds, which is what a rule file is once the routine's roles stop reading it.

Kind files are generated the same way, from a routine's `skills/<routine>/kinds/kinds.list` — `oracle` is the routine that has kinds. A `kind <name> <parts>` line concatenates the parts, in order, into the generated and tracked `skills/<routine>/kinds/<name>.md`, which is never edited by hand; the parts are the files under `skills/<routine>/kinds/<name>/`. A part is a rule in the five-part format, and the part named `head` is exempt from the format check, as the index files are. The build refuses a kind part its own kind line does not use, a kind line naming a part that is missing, and an orphaned `kinds/<name>.md` no kind line builds, and warns on any generated file over 40,000 bytes.

## Orchestrator CLIs and YAML reports

`lib/` is one shared TypeScript package containing five sibling folders (`lib/contracts/`, `lib/go-ctl/`, `lib/cycle-ctl/`, `lib/oracle-ledger/`, and `lib/slop-ctl/`) under one `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `.oxlintrc.json`, and `.oxfmtrc.json`. Both `lib/go-ctl/` and `lib/cycle-ctl/` import schemas, validators, renderers, and shared CLI registration directly from `lib/contracts/src/` with no duplication, and `lib/oracle-ledger/` and `lib/slop-ctl/` reuse the shared YAML reader in `lib/contracts/src/io.ts`. Pure state-machine transitions, brief builders, slice planning, slop-hunt validation and rendering, and oracle ledger core logic stay free of `fs` and `child_process` behind narrow I/O and git shells.

`pnpm -C lib build` compiles five self-contained, zero-dependency `esbuild` bundles tracked under the skills so every installed skill folder runs standalone:

- `skills/spec/scripts/spec-ctl.mjs` (from `lib/contracts/src/cli.ts`)
- `skills/go/scripts/go-ctl.mjs` (from `lib/go-ctl/src/cli.ts`)
- `skills/cycle/scripts/cycle-ctl.mjs` (from `lib/cycle-ctl/src/cli.ts`)
- `skills/oracle/scripts/ledger.mjs` (from `lib/oracle-ledger/src/cli.ts`)
- `skills/slop-hunt/scripts/slop-ctl.mjs` (from `lib/slop-ctl/src/cli.ts`)

Never edit those `.mjs` bundles by hand. `spec-ctl.mjs`, `go-ctl.mjs`, and `cycle-ctl.mjs` register `validate` and `render` through `registerContractCommands` in `lib/contracts/src/commands.ts`, while `slop-ctl.mjs` registers its own `validate` and `render` commands for `/slop-hunt`'s schemas. Every `/go`, `/cycle`, `/spec`, and `/slop-hunt` subagent role writes a strict YAML report to its `Report:` path and validates it with `node <skill>/scripts/<cli>.mjs validate ...` until exit `0` before returning the path.

`Taskfile.yml` wires all repo checks: `task build` runs `node lib/build-roles/src/cli.ts` and `pnpm -C lib build`; `task typecheck`, `task lint`, and `task format:check` run the matching `lib/` checks; `task test` runs `pnpm -C lib test`; and `task gate`, which CI and `/cycle` run, checks that no `SKILL.md` holds `$[0-9]`, verifies generated role files, kind files, and `skills/*/scripts/*.mjs` bundles are up to date, and runs `typecheck`, `lint`, `format:check`, and `test`.

## The rule library

`skills/meridian/references/rules/` holds one rule per file, granular by single responsibility. Routines, and a reader of the `meridian` skill itself, read it as generated rule files, one per `rules-<name>.list`, each small enough to come back whole in one file read.

## Format of a rule

The format is the house rule `core/write-every-rule-in-the-five-part-format.md`, and `node lib/build-roles/src/cli.ts` refuses a rule file that breaks it.

`core/rule-strength.md` says what Law, Default, Preference, and Tooling mean.
