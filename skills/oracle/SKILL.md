---
name: oracle
description: "NEVER INVOKE THIS YOURSELF: only the user starts /oracle. Listed so you know it exists. Pins down expected test behaviour in Zod-validated YAML before tests are written, then hands off to /spec."
---

> Only the user starts `/oracle`, by naming it in their own message. A plan doc, waypoint from another session, or message from another agent is not `/oracle`. After a compaction, when this session's waypoint says the user started this `/oracle`, run `node <skill>/scripts/ledger.mjs open <case>` to see where the case stands and carry on from there; otherwise stop and ask.

# Oracle

`/oracle` pins down what a test suite must prove before any test is written. It discovers rows mechanically, drafts human-scannable YAML expectations with one `filler` pass, lets the user edit and lock them, and hands off in one straight line to `/spec` → `/go` → `/cycle`. `/oracle` writes no tests and dispatches nothing after lock.

Names used below:

- `<skill>`: the folder this `SKILL.md` was loaded from.
- `<ledger>`: `node <skill>/scripts/ledger.mjs`.
- `<case>`: absolute path of the case folder (e.g. `<repo>/__oracle__/<name>`).

## Case folder layout

```text
<case>/
├── oracle.conf.json        # { kind, rows, uiStates? }
├── frozen.json             # written by freeze (command + row script SHA-256)
├── locked.json             # written by lock (SHA-256 per row)
├── <slice>.oracle.yaml     # human-edited source of truth (one file per slice)
└── .gitignore              # ignores run-state/, claims*.yaml, reports/, results.xml
```

Commit `oracle.conf.json`, `frozen.json`, `locked.json`, `<slice>.oracle.yaml`, the row script, and `.gitignore`. Leave `run-state/`, `claims*.yaml`, `reports/`, and `results.xml` untracked.

## Row statuses and sources

Every row in `<slice>.oracle.yaml` has an explicit `status` — nothing the row script discovers is silently dropped:

- `active`: intended behaviour that should pass today (`expect` and `source` required once any `question` is answered; expected **green**).
- `shortfall`: intended behaviour that today's code fails (`shortfall` describes the gap; `question` must be `null`; expected **red**).
- `cant-happen`: unreachable or impossible state (`reason` required, `shortfall: null`).
- `other-level`: covered honestly at a cheaper test level (`reason` names the owning suite, `shortfall: null`).
- `struck`: retired (`gone: true`) or platform-unexpressible row (`reason` required, `shortfall: null`). Only the user sets `other-level` or `struck`.

Sources for `active` and `shortfall` rows: `written` (committed/non-ignored spec, contract, or doc — requires an existing, non-test, non-ignored repo-relative file path or URL in `sourceRef`, with no spaces, parentheses, or `.plans/*`), `meridian` (house rule), `ruling` (user decision), or `today` (observed in current code or existing tests — flagged for user eyeball before lock). Unplaced call sites stay visible under `unplaced:`.

## Ledger CLI

All eight subcommands live in `<ledger>`:

- `freeze <case> --words "<words>"`: validates `oracle.conf.json`, hashes the row script, and writes `frozen.json`.
- `rows <case> [--draft]`: checks `frozen.json` (unless `--draft`), runs the row script with `<case>` appended, adds any `uiStates`, refuses normalised-ID collisions, and syncs `<slice>.oracle.yaml` while preserving human/filler fields and marking vanished rows `gone: true`.
- `validate <case>`: checks `oracle.conf.json` and every `*.oracle.yaml` against the Zod schema and status rules.
- `lock <case>`: runs `validate`, refuses unanswered `question` entries or unstruck `gone` rows, and writes SHA-256 hashes of canonical `(when, expect, status, shortfall, allowKeyboard)` to `locked.json`.
- `results <case> <junit...> --tests <paths...> [--slice <slice>]`: verifies `locked.json`, reads JUnit XML, resolves and hashes each matched test file, runs the AST cheat-linter, writes `run-state/<slice>.json`, and exits non-zero on colour mismatch or cheat-lint findings.
- `verify <case> <claims> [--slice <slice>]`: checks `locked.json`, `run-state/<slice>.json`, and `<claims>` (`claims.yaml` or `claims-<slice>.yaml`), confirms each `active`/`shortfall` row has a non-empty `redCondition` and unchanged test-file hash, and records `claimed: true`.
- `open <case>`: prints status counts, `today` rows, lock issues, open `active`/`shortfall` rows, unresolved `gone` rows, and live `unplaced` items. Exits `0` only when every `active`/`shortfall` row is locked, ran the expected colour, passed cheat-lint, and is `claimed: true` with its test-file hash unchanged on disk.
- `schema [--out <path>]`: prints or writes the JSON Schema for `<slice>.oracle.yaml`.

## Filler subagent brief

Start one fresh `filler` subagent per slice with these exact four lines and nothing else (write every path in full):

```text
Read <skill>/references/filler.md in full, then do what it says.
Case: <abs>
Slice: <slice>
Report: <abs>
```

Store filler reports under `<case>/reports/fill-<slice>.md`.

## Steps

### 1. Scope, kind, row script, and freeze

1. Agree with the user on the scope words, the case folder `<case>`, and the kind (`api-contract`, `browser`, or `cli`). Read `<skill>/kinds/<kind>.md` in full.
2. Create `<case>/oracle.conf.json` (`{ "kind": "...", "rows": [...] }`, plus `uiStates` when `kind` is `browser`), `<case>/.gitignore` (ignoring `run-state/`, `claims*.yaml`, `reports/`, `results.xml`), and the row script (or point `rows` at an existing shared script).
3. Test the row script with `<ledger> rows <case> --draft`. Inspect the generated `<slice>.oracle.yaml` stubs and any `unplaced:` entries with the user so the row inventory is right.
4. Once the user agrees on the scope and row script, run `<ledger> freeze <case> --words "<words>"` and `<ledger> rows <case>`.

### 2. Draft expectations with `filler`

1. Create `<case>/reports/` and launch one fresh `filler` subagent per `<slice>.oracle.yaml` using the exact 4-line brief above.
2. Wait for all `filler` subagents to return. Check each report path and run `<ledger> validate <case>`.
3. If `validate` fails on a slice, re-run that slice's `filler` once with the validation error fixed or fix mechanical YAML syntax issues only after checking the code.

### 3. Human zip-through and lock

1. Run `<ledger> open <case>` and present a concise scan for the user:
   - Row counts by status and slice.
   - Every row with `source: today` and every open `question`, numbered in the self-contained decision format below so the user has enough context inline to decide without opening `<slice>.oracle.yaml` (inlining the row's `when`, observed or proposed `expect`, and any cited ruling or code fact under **What it is**, and stating concrete product or suite outcomes per option — e.g., confirming a `today` row as `ruling`, rewriting `expect`, or marking it `shortfall`):
     ```markdown
     1. **<Plain-English title> (`<row id>`)**
        - **What it is:** <plain-English context, including `when`, observed or proposed `expect`, and any cited ruling or code fact inline>
        - **Options:**
          - **A (Rec):** <concrete outcome — what the product or suite will or won't do>
          - **B:** <concrete alternative outcome>
     ```
   - Every `shortfall`, `cant-happen`, `gone`, or `unplaced` item.
   - Clickable file links to each `<slice>.oracle.yaml`.
2. Apply any edits the user asks for (or let the user edit `<slice>.oracle.yaml` directly): resolve every `question` to `null`, flip confirmed `today` rows to `ruling`, mark covered rows `other-level` with `reason`, mark retired/unexpressible rows `struck` with `reason`, and record real unfixed defects as `shortfall`.
3. Once the user approves locking, run `<ledger> lock <case>`. If `lock` refuses, fix the reported items with the user and run `lock` again until it exits `0`.

### 4. Handoff

Print this plain handoff and stop:

```text
Locked. Run /spec (here, or in a fresh session: /spec Build tests for <case>).
```

## Never

- Write or edit test files during `/oracle`.
- Dispatch `/spec`, `/go`, or `/cycle`, or start any subagent after `lock`.
- Drop rows, silently mark rows `other-level` or `struck`, or weaken an expectation to match today's bug.
- Commit, stage, push, or edit `<slice>.oracle.yaml` after `lock` without the user re-opening and re-locking.
