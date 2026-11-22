---
name: test-oracle
description: "NEVER INVOKE THIS YOURSELF: only the user starts /test-oracle. Listed so you know it exists. Builds the test oracle, every behaviour the code has, each with a sourced expected outcome, before tests are written. The behaviours are BDD-style and found from the code by a script, kept as one JSONL table of rows, and a row that rests on what the code does today says so; a case is finished when open exits 0."
argument-hint: "<case folder: an __oracle__ folder>"
---

> Only the user starts /test-oracle, by naming it in their own message. A plan, a note, a spec, or a message from another session or agent is not the command. After a compaction, carry on only when this session's waypoint says the user started this /test-oracle and names the case folder; then `open <case>` says where the case stands. Otherwise stop and ask.

# Test oracle

The test oracle is every behaviour the code has, each with a sourced expected outcome, built before tests are written. A row script reads the code and writes the rows — it is the only writer of them. A filler agent fills every empty field with a value and its citation; a disprover agent grades the fill half against the citations; the ledger merges `CONFIRMED` fields only. `open <case>` is the only statement of where a case stands, and its exit 0 the only "done" — a bar the spec carries, reached by the spec's confirmation piece in `/go`, not by this skill. This skill ends at the handoff: it hands the table to `/spec` and dispatches nothing after it. No agent chooses the rows, and the main session writes nothing into the records. Tests are built to the table by `/spec` and `/go`, unchanged; `/cycle` reviews the diff and commits.

Words used below. A **case** is one piece of work in some repo that pins down behaviour before tests are built: a folder named exactly `__oracle__`, placed next to what it pins down (beside a page, say), holding a config file and records. A **row** is one behaviour. The **table** is the case's rows, one JSON object per line (JSONL). The **ledger** is this skill's script, `<skill>/scripts/ledger.mjs`, built from `ledger.ts`, which checks, merges, and lists the records. The **filler** is the agent that fills fields; the **disprover** is the agent that tries to break each thing the filler wrote. The **tracer** is a tiny CLI inside this skill's folder, `<skill>/tracer/`, with an `__oracle__` case beside it, for running the skill on.

Names used below. Write each out in full wherever a command or a brief uses it:

- `<skill>`: the folder this SKILL.md was loaded from.
- `<main>`: what `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"` prints.
- `<case>`: the absolute path of the case folder the user gave, an `__oracle__` folder. A relative path is relative to `<main>`. `<the case's folder>` below is the same folder.
- `<the row script>`: the program whose command is the `rows` list in `<case>/oracle.conf.json`. The ledger runs it in the case folder, with the case folder's absolute path appended as the last argument. Its header declares its own dependencies. It may live in the case folder or be shared between cases, as a path in the command relative to the case folder.
- `<root>`: the citation root, the folder `git rev-parse --show-toplevel` prints when run in the case folder, or the case folder itself when that fails. Every cited file is a path relative to it.
- `<the filler's role file>`: `<skill>/references/filler.md`. `<the disprover's role file>`: `<skill>/references/disprover.md`.

## Read first, in full, before anything else

The main session reads these, in this order, before it runs anything:

1. Every `rules-*.md` file in `<skill>/references/`: Meridian's testing rules, and the core rules, which open with the Laws. All of it.
2. The kind reference, `<skill>/kinds/<kind>.md`, when the user names a kind at the start. With none named, there is no kind reference.
3. This file, all of it.

A subagent reads its own role file: the brief names it, and the role file opens with what the brief gives.

## Reward hacking

Reward hacking is making the measure look good in place of making the thing true. The measures here are a green run, a closed row, a short list of findings, a report that sounds finished, and a user who seems satisfied. None of them is the goal. The goal is that every row of the case's table is tried by a test that has run, and that the test fails when the code is wrong.

A subagent's report is claims. Before you act on a claim, brief another subagent with it, or pass it to the user, check it yourself against the code, the records, or a command. A claim you didn't check goes to the user as the subagent's, never as yours. A report that stops short of what the role file asked says so, with file and line; "I couldn't, and here is what stopped me" is an acceptable result, and an open row reported as open is an acceptable result. A red test that found a defect is the job done.

## Who does what

| Work | Done by |
|---|---|
| Writing the rows | The row script prints them; the ledger writes them |
| Filling fields, and disproving them | Two agents; the disprover grades the fill half only |
| Merging confirmed fields, checking a quote is in its file, listing open rows, and "done" | The ledger |
| Freezing the row script, ruling on questions, striking rows | The user |
| The spec, the tests, the grading of the `Test` half, and the case's close | `/spec` and `/go`, after the handoff; `/cycle` reviews and commits |

## The hard rules

- **Who may act**

  - **Only the user starts it**, as with `/go` and `/cycle`.
  - **Scope first.** The user and the main session agree what a row is for this case, and what the rows are read from. It is said in the conversation; nothing is written to a file.
  - **The row script is written together and frozen by the user.** `freeze` records the user's words, the date, the rows command, and the script's file and sha256 in `frozen.json`; the command and the hash pin the script, so `rows` refuses to write once either has changed, until the user freezes it again. The pin is on the command and the files it names, not on what the script reads: a script whose rows depend on other files is self-contained, or the user freezes what it reads. The aim is not 100% coverage; it is a script that produces what the user wants. A miss found later goes to the user; nobody quietly repairs the script.
  - **The table belongs to the script.** It is the only writer of rows, and of which fields each row has: every field to fill is printed as null, so no agent shapes what is filled. Ids come from content, never from position.
  - **The main session writes nothing into the records.** Nothing reaches the table except through a `CONFIRMED` verdict; the main session writes no fields itself, so its prose carries no authority over the records.

- **The loop**

  - **One loop, run once per pass.** Fill, disprove each (id, field), merge `CONFIRMED` only, list what is open. This skill runs the `fill` pass; the `test` pass is the spec's confirmation piece, run in `/go`.
  - **Disproving the row script is on demand.** The disprover role can be pointed at a row script when the user says so. It is not a fixed step.
  - **Presenting is a command.** The statement is `open <case>`; see it under "The ledger" and the invariant under "The records". Every finding is in the report's Missed list, never only in a clause elsewhere.

- **The row script**

  - **The script shows its working.** It prints what it read, what it left out, and why. What it can't place goes to a file. It reads its source with a real reader for that format: a JSON parser for JSON, a syntax tree for code, the catalog for a database, the compiler's own model where there is one. It never picks rows out of source text with regular expressions. What it can't read, it says it couldn't.

- **Sources and citations** — the runner's half; the filler's rules hold the source order and the citation-fit rules.

  - **No source, and the code's own say is unclear or contradicts itself:** the field is a question for the user — one question with one recommended answer, not two readings and "your call". Where two written sources disagree, that is a question too.
  - **A ruling is recorded with `rule`.** The answer goes into a rulings file in the user's words and with the date — the row's slice's `rulings.md`, the top-level `rulings.md` when the ruling is case-wide.
  - **`today` is labelled.** A value that rests on what the code does today carries `today`, and `open` lists every row that rests on it, under "expected from today's code:", so nobody takes it for intent.

- **The row closes, and the table is the promise**

  - **Only a test that has run closes a row.** A row is closed in three ways only: the user's strike; a confirmed `CantHappen`; a confirmed `Test` whose `Ran` is the colour the row expects. A test that exists in a file and has never run does not close it.
  - **Never narrow a promise to fit what was built.** The case's table is the promise. A row id is never removed, renumbered, merged away, reworded smaller, or moved to a list of things left out. If the tests cover less than the table, the tests are short.

## The records

One set per case, under `<the case's folder>/`. The records **are** the artefact: JSONL only, no markdown document, no generated view. The word "table" survives as the name of the record set.

A case is a folder named exactly `__oracle__`, placed next to what it pins down. The ledger takes the folder's path and refuses, with exit 2 and nothing written, one whose final folder name is anything else (`__oracles__`, `oracle`), and one whose `rows` command names no existing file when resolved against the case folder — a case must reach its row script. The row script is not in the folder unless the case wants it there, so a script can be shared between cases. The tests a case pins down live in the repo, beside the thing the case pins down: the case holds the table and its records, never the tests. The folder has this layout:

```
<the thing the case pins down>         a page, a CLI, a module: the case sits beside it
__oracle__/                            the case folder: named exactly this
  oracle.conf.json                     {"rows": [<the row script's command>]}, written with the user. Committed
  frozen.json                          written only by freeze: {"date", "words", "command", "script": {"file", "sha256"}}. Committed
  rulings.md                           written only by rule: the case-wide rulings, one line each. Committed
  <slice>/                             one folder per slice the row script names: the slice's complete record
    oracle.jsonl                       written only by the ledger: the slice's rows and its declared-unplaced lines. Committed
    rulings.md                         written only by rule: the slice's rulings, one line each. Committed
    fill-fields.jsonl                  the filler's, for the fill pass. Working file, ignored
    fill-verdicts.jsonl                the disprover's, for the fill pass. Working file, ignored
    test-fields.jsonl                  the confirmation piece builder's, for Test. Working file, ignored
    test-verdicts.jsonl                the confirmation piece critic's, for Test. Working file, ignored
  reports/                             every agent's prose report. Working file, ignored
  results.xml                          a test run leaves. Working file, ignored
```

A slice is a name the row script gives its rows (`Slice`, a folder name; a row with none gets `all`). A slice folder is the slice's complete record: its rows and its unplaced lines, its rulings, and its working files — `fill-fields.jsonl` and `fill-verdicts.jsonl` belong to the fill pass, run here; `test-fields.jsonl` and `test-verdicts.jsonl` belong to the spec's confirmation piece, written in `/go`. The slices are the case's only folders under it, apart from `reports/`.

The oracle is committed: `oracle.conf.json`, `frozen.json`, the top-level `rulings.md`, and every slice folder's `oracle.jsonl` and `rulings.md`. The working files are ignored, in a `.gitignore` inside the `__oracle__` folder that ignores everything and un-ignores exactly those: `*`, then a `!` line for each of `.gitignore`, `oracle.conf.json`, `frozen.json`, `rulings.md`, the row script when it sits in the folder, `*/oracle.jsonl`, and `*/rulings.md`.

**`oracle.conf.json` holds exactly one key, `rows`**: a non-empty list of strings, the row script's command. Any other key, a missing file, text that is not JSON, or a value that is not an object is exit 2 with a named message. The ledger runs the command in the case folder and appends the case folder's absolute path as its last argument, so `["uv", "run", "rows.py"]` runs as `uv run rows.py <absolute case folder>`. Paths in the command are relative to the case folder, so one script can serve many cases: `["uv", "run", "../../../.oracle/page-rows.py"]`. The script finds its source in the repo, not beside the case: it runs `git rev-parse --show-toplevel` in the case folder and reads its sources relative to that root, so a case at any depth in the tree reads the same sources.

**The row script's file** is the last element of the command that names an existing file when resolved against the case folder, scanning left to right — a runner or interpreter sits at the front of the command, the script at the end: `x.py` for `["uv", "run", "x.py"]`, and `rows.py` for `["python3", "rows.py"]` and `["/usr/bin/python3", "rows.py"]`. `freeze` pins that file in `frozen.json`, as its path relative to the case folder and the sha256 of its bytes, and pins the rows command itself.

Nothing is written by hand but `oracle.conf.json` and the row script. The row script decides which rows exist and which fields they carry, and the ledger reads the fields from the rows.

**Each row the script prints carries every field to be filled, present with the value `null`.** A non-null field is the script's own. A field printed as null is a field to fill, and the table keeps it as null until a confirmed value replaces it. There are two passes, fixed:

- `fill` owns every null field the script printed other than `Test`. `CantHappen` and `Shortfall` have the meanings below; every other `fill` field is an expected field, and its values carry `Source`.
- `test` owns exactly the field `Test`, which every row prints as null.

`rows` refuses a row that prints no field to fill, a row that does not print `Test` as null, a row that prints `Gone`, `Ran`, or `Struck`, a `CantHappen` or `Shortfall` that is not null, and an object that has the shape of a merged field, with exit 2 and nothing written.

**A declared-unplaced line** is the script's say on what it found in its source and could not turn into a row: one JSON line with an `Id` (made from the line's content, unique across the case like a row's), a `Slice`, and an `Unplaced` field holding the reason, and nothing to fill — no null value, no `Test`, and no `Expected`, `CantHappen`, or `Shortfall`. A line is unplaced by that shape, not by a type word. The row script prints its unplaced lines on stdout with the rows, and the ledger stores each in the slice folder it names. A line that carries a null, a `Test`, or a row field is a row, and is held to the rows' bars. A declared-unplaced line is never open and never changes `open`'s exit code: `open` lists the live ones, with their reasons, under "declared unplaced:", and the user retires one with `strike`, as a row. A line the row script stops printing stays, marked `Gone`, as the rows do.

**Three field names have a meaning to the ledger; every other field is the script's.**

- `CantHappen` is the cited chain that shows the row can't happen; every link of it must be cited, because one missing link makes the row able to happen. A confirmed one closes the row.
- `Shortfall` is what today's code does where it falls short of the row's expected value, cited. A row with a confirmed `Shortfall` expects a red test, and every other row expects a green one.
- `Test` is the claim that the row's test does what the row says and asserts its expected value, citing the test.

**The owner map.** Agents write only their own files; the row script only prints; the ledger is the sole writer of the `oracle.jsonl` files, and every merge into them is a deterministic command.

| What | Written by | What it holds |
|---|---|---|
| `oracle.conf.json` | the user and the main session, by hand | the row script's command, as the one key `rows` |
| the row script (in the case folder, or shared) | the user and the main session, by hand | it prints every row, each with every field to fill as null, and its declared-unplaced lines |
| `frozen.json` | the ledger, by `freeze` only | the user's words that the row script is right, the date, the rows command, and the script's file and sha256 |
| `rulings.md`, and `<slice>/rulings.md` | the ledger, by `rule` only | the user's rulings, one line each: case-wide lines at the top level, a row's ruling in its slice's file |
| `<slice>/oracle.jsonl` | the ledger only | one line per row and per declared-unplaced line of the slice: the script's fields, then every merged field (null until merged), `Ran`, and `Gone` or `Struck` where they hold |
| `<slice>/fill-fields.jsonl` | the filler | one record per (row id, field) for the slice's rows, in the shape its role file gives |
| `<slice>/fill-verdicts.jsonl` | the disprover | one record per (id, field): `Verdict` is one of CONFIRMED, PARTLY, WRONG, CAN'T TELL |
| `<slice>/test-fields.jsonl` | the confirmation piece's builder, briefed by the spec, in `/go` | its `Test` claims, in the same shape |
| `<slice>/test-verdicts.jsonl` | the confirmation piece's critic, in `/go` | one record per claim, verdicts as the disprover's |
| `reports/*.md` | every agent | prose evidence; each bullet keyed by row id at line start, so `grep -rn <id> reports/` is the join |

Within a row: `Id` — unique, made from the row's content, never from its position — `Slice`, and every field the script prints with a value are the script's, rewritten on every `rows` run; a field the script printed as null merges only through `merge <case> fill <slice>`; `Test` merges the same way through `merge <case> test <slice>`, in `/go`; the ledger alone writes `Ran`, `Gone`, and `Struck`, and gives a row with no `Slice` the slice `all`; the user's words reach the records only as command arguments, through `strike`, `rule`, and `freeze`. No agent adds any record, and none removes one.

**The citation bar.** Greppable is the bar: an agent's citation is a file under `<root>` plus a verbatim quote — a grep-able anchor, never a line number: line numbers rot and quotes grep, and the ledger does the grep, with whitespace runs compared as one space. No citation carries a hash; the one hash in the system is the row script's, in `frozen.json`, and it pins the script, not a citation. Script fields keep `file:line`, because those lines do not rot. There is no second tier of claim: a claim carries its citation or it is refused. No citation of any source may name a file under the case folder — the slice folders, `reports/`, and the top-level files — the one exception being a `ruling`, which cites a rulings file: the top-level `rulings.md`, or the row's slice's `rulings.md`. A field holds a value with its citation, or it is empty and the row stays open; nothing is inferred, and "unable to prove" is not a field value. `CAN'T TELL` survives only as a disprover's gate verdict meaning *don't merge*.

**The invariant the machinery keeps, and the trust model that enforces it.** Every row is written by the row script through `rows`, and no agent adds, removes, merges, splits, or rewords one. A field reaches the table only through `merge`, on a `CONFIRMED` verdict that quotes the fill it judged; PARTLY, WRONG, and CAN'T TELL leave the field empty, which leaves the row open, which sends the work back through the loop. Laziness has a shape: an open row. A merged field whose quote is no longer in its file is set back to null, and the row reopens, so the promise can never quietly shrink. `open`'s output is the only statement of where a case stands, and its exit 0 is the only done.

**The row script is frozen: it finds what it finds.** A thing in what the rows are read from that no row holds, and that the script's stderr does not name as left out, is a **finding for the user**, in a report's Missed list, with the file and the quote; the script is never repaired mid-loop.

**Re-runs are a key-preserving merge:** `rows` rewrites the script's own fields and keeps every merged field and every `Struck`. A row the script stops printing stays, marked `Gone`, and is open until the user strikes it.

## The ledger

Each command is run as `node <skill>/scripts/ledger.mjs` with its subcommand and arguments. Exit codes: 0 fine; 1 a gate is red; 2 an input can't be read or is malformed, and then nothing is written. What a command refuses, and why, is the implementation's to say: it names each problem, and its schemas and error messages are the spec for what it accepts and refuses.

The eight commands — what each does, what it writes, and when it exits:

- `freeze <case> --words "<the user's words>"` writes `<case>/frozen.json` — `{"date": "<today>", "words": "<the user's words>", "command": "<the rows list, verbatim>", "script": {"file": "<the row script's file, relative to the case folder>", "sha256": "<hex of its bytes>"}}` — and it is the only writer of that file. It exits 2 and writes nothing when no element of the rows command names an existing file, or the words are empty.
- `rows <case> [--draft]` runs `<the row script>` and merges what it prints into each slice's `oracle.jsonl`, rows and declared-unplaced lines alike; a re-run is a key-preserving merge, as "The records" says. It exits 1 and writes nothing when the rows command, or the script's file, no longer matches the pin in `frozen.json`, naming the change; it exits 2 and writes nothing when two ids of the table, live or gone, rows and unplaced lines alike, are equal once compared lower-case with only letters and digits — a test name could not tell them apart, and the gone row is struck first. With `--draft`, or with no `frozen.json`, it prints the lines and writes nothing (exit 0 with `--draft`, exit 1 without it). It prints the freeze, and counts: rows, new, gone, unplaced, new, gone, and fields emptied.
- `check <case> <pass> <slice>` is the parity gate on a fill; `<pass>` is `fill` or `test`. It writes nothing, and exits 1, naming each problem by `Id` and `Field`, until every record and every quote holds; the gate's list is in the filler's role file, "Run the parity gate before you report".
- `merge <case> <pass> <slice>` runs the parity gate first, and exits 1 if it is red. It writes the slice's `oracle.jsonl`: a field becomes its value when the verdict is `CONFIRMED` and `Judged` equals the fill record without `Id` and `Field`, and is set back to null otherwise; an `Empty` record changes nothing. In the `fill` pass, a change to an expected field's value sets the row's `Test` back to null: the claim was graded against the old expectation, and the test pass re-grades it. It exits 2 and writes nothing when the verdicts file is missing, or its records are malformed, or name an (`Id`, `Field`) the fill does not hold. It prints how many fields merged, how many stay empty, and how many Tests it emptied.
- `results <case> <file>… [--slice <slice>]` reads the JUnit XML files of one whole run, writes `Ran` on every row from these files alone, and a test that names no row is no error. A failed assertion is `red`; an errored test is `not-run` with its own saying, because it died before its assertion and gives no result. It exits 2 and writes nothing when a test's name equals two rows' ids. It then judges the rows in scope (the slice, or every row) that are ready for a test — not struck, not `Gone`, with no confirmed `CantHappen`, and holding a value in every `fill` field other than `CantHappen` and `Shortfall` — and exits 1, naming each ready row that has no run result, was skipped, errored before its assertion, or ran a colour the table does not expect; the rows not ready are printed, with the field that is missing or is a question, and they do not change the exit code. The ledger does not run tests.
- `rule <case> [id] [field] --words "<the user's words>"` appends one line: for a row, to the row's slice's `rulings.md`, `- <date> · <id> · <field>: <the user's words>`; case-wide, without id and field, to the top-level `rulings.md`, `- <date> · <the user's words>`. It changes nothing in the table. It exits 2 when the id is not a row, or the field is not a field to fill on it. A slice's `rulings.md` holds only its rows' rulings, and the top-level holds only case-wide lines; a value cites the line it rests on, in whichever tier it sits, and where a slice line and a case-wide line pull apart, the disagreement is a question for the user. A question with a ruling stops being a question for the user: `open` lists its row as unfilled, and the filler is sent again for that pass and slice.
- `strike <case> <id> --why "<the user's words>"` sets `Struck` to the user's words and the date in the `oracle.jsonl` the id sits in — a row's slice, or the slice of a declared-unplaced line. It exits 2 without writing when the id is neither.
- `open <case>` writes nothing. It prints every open row, by id, with its reason — gone, stale, unfilled, no confirmed test, no run result, ran the wrong colour — plus the rows it lists for the user (a question with no ruling), the live declared-unplaced lines with their reasons, and the expected values that rest on today's code, under "expected from today's code:". A table with no rows is not done. It exits 1 when any row is open, else 0; the unplaced lines never change the exit code. The main session relays its output as it prints, never a summary in its own words.

## The loop

One case at a time. The main session dispatches roles, runs the ledger commands, and relays their output: it writes nothing into the table and claims nothing about it — the commands' exit codes are its voice. The filler runs as a *builder* and the disprover as a *critic*, the roles the user's instructions list under "Subagent models": start each on the model and effort those instructions give its role, with all three of provider, model, and effort named in the call where the agent takes them. This skill names no model of its own. Each subagent saves its report with a shell heredoc to the absolute path in its brief and replies with only the path.

Every subagent gets exactly these lines as its whole brief, with every path written out in full, and nothing added:

```
Read <skill>/references/<filler | disprover>.md in full, then do what it says.
Case: <the case folder's absolute path>
Slice: <the slice name>
Kind: <the kind file's absolute path>
Files: <the absolute paths the role works on>
Report: <the report's absolute path>
```

`Files` is the filler's `<slice>/fill-fields.jsonl`; for the disprover it is `<slice>/fill-verdicts.jsonl`, the filler's `<slice>/fill-fields.jsonl`, and the filler's report. For a disprover pointed at the row script, `Files` is the script's path and the `Slice` line is omitted. The `Kind` line is added only where the user has named a kind; with none named, the brief omits it. Start each subagent fresh: a new agent that has only its brief, not a fork of this conversation.

Check you can start subagents. If you can't, say so and stop.

### 1. Scope

Agree with the user what a row is and what the rows are read from. It is said in the conversation; nothing is written to a file. The kind references are in `<skill>/kinds/`, and the opening of each names the cases it fits. Check the work against them, and where one fits, put it to the user with the file named — the user names the kind, and it enters the read-first list; where none fits, say so and go on with none.

Done when: the user has said it is what they meant.

### 2. The row script

Write the row script with the user: in the case folder, or shared with other cases, in which case a path in its command reaches it. Put its command in `<case>/oracle.conf.json`, as `{"rows": [...]}`. The script takes the case folder's path as its last argument, finds the repo root with `git rev-parse --show-toplevel` run in the case folder, and reads its sources relative to that root. It reads its source with a real reader for that format (see "The script shows its working"). It prints every row with every field to fill as null, `Test` included. Show its rows with `node <skill>/scripts/ledger.mjs rows <case> --draft`, and fix the script until they are the rows the user wants and the fields they want filled. Only when the user says it looks right, run `node <skill>/scripts/ledger.mjs freeze <case> --words "<the user's words>"`. When the user says so, dispatch `<the disprover's role file>` at the row script: it reads the row script and what the rows are read from, lists what the script misses, misreads, or numbers by position, and writes a report and no verdicts file.

Done when: `<case>/frozen.json` holds the user's words, the date, and the row script's pin.

### 3. The table

Run `node <skill>/scripts/ledger.mjs rows <case>`. It writes the records. The script's stderr names what it left out; each miss is a finding for the user. If the command refuses (exit 1) because the row script changed since the freeze, tell the user and show them the change; the script is frozen again only on the user's word, with `freeze`.

Done when: the command exits 0 and has printed the counts.

### 4. Fill, disprove, merge

For each slice of the table, run the loop once, on the `fill` pass. The `test` pass is the spec's confirmation piece; it runs in `/go`, after the tests are built.

1. Dispatch `<the filler's role file>`, one brief per slice: it fills the pass's fields for every row of the slice, in `<slice>/fill-fields.jsonl` — for `fill`, the fields each row printed as null, other than `Test`. It decides no row. What the records are missing — a thing the row script should have written as a row — is the report's Missed list: findings for the user.
2. Run the parity gate: `node <skill>/scripts/ledger.mjs check <case> fill <slice>`. It exits 1 until every record and every quote holds.
3. Dispatch `<the disprover's role file>`, one brief per slice, its `Files` carrying the filler's records and report. It tries to disprove every value and question record of the fill, and what was missed; it verifies every citation by grepping the quote in the named file, writes its prose evidence into `reports/`, **and** writes `<slice>/fill-verdicts.jsonl` — one record per (id, field). It grades the fill half only; the `Test` half is the confirmation piece's critic, in `/go`.
4. Run the merge: `node <skill>/scripts/ledger.mjs merge <case> fill <slice>`. It appends `CONFIRMED` fields only.

Done when: `check` exits 0 and `merge` has run for every slice of the pass, and every Missed finding is named to the user.

### 5. Present

Run `node <skill>/scripts/ledger.mjs open <case>` and relay its output. Put each question for the user to them with its one recommended answer, and each declared-unplaced line with its reason. Record an answer with `node <skill>/scripts/ledger.mjs rule <case> <id> <field> --words "<the user's words>"`, and a case-wide ruling without id and field: `rule <case> --words "<the user's words>"`. The user strikes a row or a declared-unplaced line, nobody else: `strike <case> <id> --why "…"`; their words travel as the argument, and `Struck` retires it. After a `rule` on a row, run step 4 again for that row's slice.

`open <case>` names every open row, by id, with its reason, and sends the work back: to step 4 if a field is unfilled, or a question has been ruled; to steps 3 and 4 if a field is stale, because `rows` sets it back to null; to the user if a row is gone from the row script or is a question for the user, or if the table has no rows (the row script printed none, which is a finding for the user); to step 6 if the case has no spec yet and a row has no confirmed test. Step 6 is the last step: after the handoff, the case's remaining rows are the spec's bar, and `open` is a tool anyone re-runs — this skill routes no work past the handoff.

Done when: every row `open` named has been answered, struck, or sent back, and the user has seen the output.

### 6. The pre-spec step

When the `fill` pass is merged (a row that is still a question for the user does not hold the step back), read `<skill>/pre-spec.md` in full, and send the user this line, with the absolute paths filled in, ready to paste into this session or a fresh one:

```
/spec Build the tests for the test-oracle case at <the case folder's absolute path>. Its tables, one <the case folder's absolute path>/<slice>/oracle.jsonl per slice, are the oracle. Its kind is <kind>; read <the kind file's absolute path> in full. Follow <the absolute path of pre-spec.md> in full.
```

With no kind named in step 1, leave the kind sentence out of the line.

Done when: you have read `pre-spec.md` in full and sent that line with the absolute paths filled in.
