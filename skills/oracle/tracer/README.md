<h1 align="center">Oracle Tracer</h1>

**This directory is a live, committed proof of the `/oracle` skill.** It exercises the full `/oracle` → `/spec` → `/go` pipeline against a 30-line TypeScript decider ([`ticket.ts`](ticket.ts)), from mechanical row discovery through a locked expectation table to a generated test suite verified by the ledger.

Rather than mocking the pipeline with throwaway fixtures, every file here was produced by running the skill end to end. One of the nine transitions (`paused_close`) is a deliberate defect in `ticket.ts`, and its test in [`test/ticket.test.ts`](test/ticket.test.ts) stays plainly red until the defect is fixed. Because that test is red by design, this suite is not wired into the root `task test` gate.

## Prerequisites

- **Node.js 22.6+** — runs `.ts` files directly (`node rows.ts` and `node --test`) with no build step or test framework.

## What is in here

| File | Role |
| --- | --- |
| [`ticket.ts`](ticket.ts) | Subject under test: a pure 3×3 ticket lifecycle decider (`open`, `paused`, `closed` × `pause`, `resume`, `close`). Refuses `decide("paused", "close")` instead of transitioning to `"closed"` — the one deliberate defect. |
| [`__oracle__/oracle.conf.json`](__oracle__/oracle.conf.json) | Case config declaring `kind: "cli"` and the row discovery command (`["node", "rows.ts"]`). |
| [`__oracle__/rows.ts`](__oracle__/rows.ts) | Mechanical row script. Imports `STATUSES` and `ACTIONS` directly from `ticket.ts` and emits all 9 `(status, action)` pairs as JSON lines so no combination can be hand-omitted. |
| [`__oracle__/frozen.json`](__oracle__/frozen.json) | Scope words (`"ticket lifecycle decider"`) and the SHA-256 hash of `rows.ts`, written by `ledger.mjs freeze` so the row script cannot drift silently. |
| [`__oracle__/lifecycle.oracle.yaml`](__oracle__/lifecycle.oracle.yaml) | Human-reviewed source of truth for all 9 rows: 8 `active` rows and 1 `shortfall` (`paused_close`), each confirmed as `source: ruling`. |
| [`__oracle__/locked.json`](__oracle__/locked.json) | Per-row SHA-256 hashes of canonical `(when, expect, status, shortfall)` fields, written by `ledger.mjs lock` so a builder cannot weaken expectations after lock. |
| [`__oracle__/.gitignore`](__oracle__/.gitignore) | Keeps ephemeral run artifacts (`run-state.json`, `claims.yaml`, `reports/`, `results.xml`) out of git while committing the oracle definition and lock files. |
| [`test/ticket.test.ts`](test/ticket.test.ts) | The 9 `node:test` cases generated from the locked oracle. Eight pass today; `paused_close` asserts `{ ok: true, next: "closed" }` and fails plainly until `ticket.ts` is fixed. |

## Run it

From `skills/oracle/tracer/`:

```sh
node --test --test-reporter=junit --test-reporter-destination=__oracle__/results.xml test/ticket.test.ts
```

This runs all 9 tests and exits `1`: 8 pass and `paused_close` fails against today's `ticket.ts`.

Next, feed the JUnit XML into the oracle ledger:

```sh
node ../scripts/ledger.mjs results __oracle__ __oracle__/results.xml --tests test/ticket.test.ts
```

This exits `0`. The ledger checks `locked.json` against `lifecycle.oracle.yaml`, confirms the 8 green / 1 red colour matches `active` / `shortfall`, and runs the AST cheat-linter on `test/ticket.test.ts` (no `.skip`, `.only`, `test.fail`, or `test.fixme`).

On a fresh checkout, `node ../scripts/ledger.mjs open __oracle__` will report the rows as unclaimed until `claims.yaml` is verified via `ledger.mjs verify` (because `claims.yaml` and `run-state.json` are gitignored).

## Documentation

[Oracle skill](../SKILL.md) · [Oracle-to-spec handoff](../handoff.md)
