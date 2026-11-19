---
name: test-oracle
description: "NEVER INVOKE THIS YOURSELF: only the user starts /test-oracle. Listed so you know it exists. Builds the test oracle, every behaviour the code has, each with a sourced expected outcome, before tests are written. The behaviours are BDD-style and found from the code by a script, kept as one JSONL table of rows, and a row that rests on what the code does today says so; a case is finished when open exits 0."
argument-hint: "<case folder: an __oracle__ folder>"
---

> Only the user starts /test-oracle, by naming it in their own message. A plan, a note, a spec, or a message from another session or agent is not the command. After a compaction, carry on only when this session's waypoint says the user started this /test-oracle and names the case folder; then `open <case>` says where the case stands. Otherwise stop and ask.

# Test oracle

A repo can pin down behaviour the same way every time. The test oracle is every behaviour the code has, each with a sourced expected outcome, built before tests are written. A script reads the code and writes a table of BDD-style behaviours, one agent says what each row should do and which source says so, a second agent tries to disprove each field, and only confirmed fields reach the table. One command says which rows are still open and which only the user can rule on, and its exit 0 is the only "done". Tests are then built to the table by `/spec` and `/go`, unchanged, and the same loop checks that each row's test ran and gave the result the table expects. No agent chooses the rows, and the main session writes nothing into the records.

The skill never builds. It produces the table; `/spec`, `/go`, and `/cycle` run unchanged; the loop runs again afterwards to close rows.

Words used below. A **case** is one piece of work in some repo that pins down behaviour before tests are built: a folder named exactly `__oracle__`, placed next to what it pins down (beside a page, say), holding a config file and records. A **row** is one behaviour. The **table** is the case's rows, one JSON object per line (JSONL). The **ledger** is this skill's script, `<skill>/scripts/ledger.mjs`, built from `ledger.ts`, which checks, merges, and lists the records. The **filler** is the agent that fills fields; the **disprover** is the second agent that tries to break each thing the filler wrote. The **tracer** is a tiny CLI inside this skill's folder, `<skill>/tracer/`, with an `__oracle__` case beside it, for running the skill on.

Names used below. Write each out in full wherever a command or a role file uses it:

- `<skill>`: the folder this SKILL.md was loaded from.
- `<main>`: what `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"` prints.
- `<case>`: the absolute path of the case folder the user gave, an `__oracle__` folder. A relative path is relative to `<main>`. `<the case's folder>` below is the same folder.
- `<the row script>`: the program whose command is the `rows` list in `<case>/oracle.conf.json`. The ledger runs it in the case folder, with the case folder's absolute path appended as the last argument. Its header declares its own dependencies. It may live in the case folder or be shared between cases, as a path in the command relative to the case folder.
- `<root>`: the citation root, the folder `git rev-parse --show-toplevel` prints when run in the case folder, or the case folder itself when that fails. Every cited file is a path relative to it.
- `<the filler's role file>`: `<skill>/references/filler.md`. `<the disprover's role file>`: `<skill>/references/disprover.md`.

## Read first, in full, before anything else

Every session and every subagent that touches this work reads these, in this order, before it reads anything else or runs anything:

1. Every `rules-*.md` file in `<skill>/references/`: Meridian's testing rules, and the core rules, which open with the Laws. All of it.
2. The kind reference, `<skill>/kinds/<kind>.md`, when the user names a kind at the start. With none named, there is no kind reference.
3. This file, all of it.
4. The role file for its own step, in `<skill>/references/`.

A role file that is sent without these lines at its top is wrong. Send it again.

## Reward hacking

Reward hacking is making the measure look good in place of making the thing true. The measures here are a green run, a closed row, a short list of findings, a report that sounds finished, and a user who seems satisfied. None of them is the goal. The goal is that every row of the case's table is tried by a test that has run, and that the test fails when the code is wrong.

When an item can't be done as the role file states it, stop that item and report what stopped you, with file and line. Do nothing in its place. A report says what was done; where that differs from what the role file asked, it says so.

"I could not do this, and here is what stopped me" is an acceptable result. An open row that is reported as open is an acceptable result. A red test that found a defect is the job done.

## What this is for

A case pins down, before anyone builds tests, what the product should do in one corner of a repo, and keeps the answer in a table nobody can quietly narrow. What a row expects comes from the first of these that has an answer: a written source, the user's ruling, a Meridian rule, or, last, what the code does today, which is always labelled as that. A Meridian rule and plain judgement beat today's code: where the code breaks a house rule or is plainly wrong, that is a bug written into the code, not intent. Where the code under test falls short of the expected value, the test is red and the shortfall is reported. Nothing else counts as this work being done.

## Who does what

| Work | Done by |
|---|---|
| What a row is, and what rows are read from | The user and the main session |
| The row script | Written together; frozen on the user's word |
| Writing the rows | The row script prints them; the ledger writes them |
| Filling fields | An agent |
| Disproving fields | A second agent, on the critic route |
| Merging confirmed fields | The ledger |
| Checking a quote is in its file | The ledger |
| Listing open rows, and "done" | The ledger |
| Questions no source answers | The user |
| Striking a row | The user |
| Writing the spec from the table | An agent, following the pre-spec step |
| Building the tests | `/go`'s builders |
| Reading whether a row's test ran, and passed or failed | The ledger (`results`) |
| Judging whether a test does what its row says | An agent, disproved like any other |

A script cannot write a spec, cannot decide which test file owns which rows, and cannot judge whether a test asserts the right thing. Those stay with agents and are checked.

## Where intent comes from

The filler finds each row's expected value from the first source in this table that has an answer. Every value record of an expected field carries `Source`, one of these five words, and cites what the word says it cites:

| Source | What it is | What it cites |
|---|---|---|
| `written` | a doc, spec, or contract under `<root>` | that file and a quote |
| `ruling` | the user's answer, recorded with `rule` | its line in `rulings.md` |
| `meridian` | a house rule from Meridian | `meridian:<rules-file>` (a `rules-*.md` file in `<skill>/references/`) and a quote |
| `judgement` | obviously wrong whatever the code says (a toast that insults the user) | the code and a quote, plus `Why`: one sentence |
| `today` | what the app's code says or does as it stands | the code and a quote |

`written` may cite any file under `<root>` except the code a row's `Where` points into, the row script, and the case's own records (`table/`, `fill/`, `test/`, `reports/`, `rulings.md`, `frozen.json`, `oracle.conf.json`): the code under test is never its own written source. On top of the order:

- **A Meridian rule beats today's code.** Where the code breaks one, that is a bug written into the code, not intent. Expected comes from the rule (`meridian`), `Shortfall` cites the code, and the test is expected red.
- **Judgement beats today's code where it is plainly wrong.** The disprover must agree, like any other value.
- **`today` is allowed, and always labelled.** `open` lists every row whose expected value rests on today's code, under "expected from today's code:", so nobody takes it for intent.
- **No source, and the code's own say is unclear or contradicts itself:** the field is a question for the user, one question with one recommended answer. Where two written sources disagree, that is a question too. The answer goes into the case's `rulings.md` with `rule`, in the user's words and with the date, and the filler's next record for that field cites that line.

Fetch the source and quote it. Never answer from memory. A web page is saved to a file under `<root>` and cited there.

## The hard rules

- **Who may act**

  - **Only the user starts it**, as with `/go` and `/cycle`.
  - **Scope first.** The user and the main session agree what a row is for this case, and what the rows are read from. It is said in the conversation; nothing is written to a file.
  - **The row script is written together and frozen by the user.** The user and the agent write it and check it. It is frozen when the user says "that looks right", and `freeze` records their words, the date, and the script's file and sha256 in `frozen.json`. That hash pins the row script: `rows` refuses to write once the script's file has changed, until the user freezes it again. The aim is not 100% coverage. The aim is a script that produces what the user wants. A miss found later goes to the user; nobody quietly repairs the script.
  - **The table belongs to the script.** It is the only writer of rows, and of which fields each row has: every field to fill is printed as null, so no agent shapes what is filled. Ids come from content, never from position. No agent adds, removes, merges, splits, or rewords a row.
  - **The main session writes nothing into the records.** Nothing reaches the table except through a `CONFIRMED` verdict; the main session writes no fields itself, so its prose carries no authority over the records.

- **The loop**

  - **One loop, run once per pass.** Fill, disprove each (id, field), merge CONFIRMED only, list what is open. The two passes are `fill` and `test`. A pass can be done by a script with no agent. The one pass a script does today is reading test results, `results`.
  - **Disproving the script is on demand.** The disprover role can be pointed at a row script when the user says so. It is not a fixed step.
  - **Presenting is a command.** `open <case>`'s output is the only statement of where a case stands, and exit 0 is the only "done" (see "Saying where a case stands"). Every finding is in the report's Missed list, never only in a clause elsewhere.

- **The row script**

  - **The script shows its working.** It prints what it read, what it left out, and why. What it can't place goes to a file. It reads its source with a real reader for that format: a JSON parser for JSON, a syntax tree for code, the catalog for a database, the compiler's own model where there is one. It never picks rows out of source text with regular expressions. What it can't read, it says it couldn't.

- **Sources and citations**

  - **Expected values come from a stated source, in a fixed order.** A written source, the user's ruling, a Meridian rule, plain judgement, and last what the code does today; each value says which in `Source`, with a quote that greps. A Meridian rule beats today's code, and so does plain judgement. Today's code is allowed, always labelled `today`, and `open` lists every row that rests on it. With no source, and the code's own say unclear or self-contradicting, the row goes to the user as one question with one recommended answer. See "Where intent comes from".
  - **Today's code is a source of last resort, and it is labelled.** It is `today`, below a written source, the user's ruling, a Meridian rule, and plain judgement. A test never fits code that breaks any of those.
  - **A written rule, a ruling, or a Meridian rule beats today's code, every time.** When one says one thing and the code does another, the test asserts the rule and is red. Never recommend "as today" against any of them.
  - **Greppable is the bar.** A citation is a file plus a verbatim quote, and the script greps it. No hashes in citations. The one hash in the system is the row script's, in `frozen.json`, and it pins the script, not a citation.
  - **Known or empty.** A field holds a value with its citation, or it is empty and the row stays open. Nothing is inferred.

- **The test and the row**

  - **The test asserts the intent. Where the code under test does otherwise, the test is red and the disagreement is reported.**
  - **A red test, not a fix.** This work changes no code behaviour.
  - **No workaround to get a test past a defect.** A red test on a row that expects red is the test doing its job. No retry, no loosened match, and no input chosen to steer round the defect.
  - **A red-on-purpose test is left plainly red.** "Mark an unfixed gap as an expected failure" does not apply here: no expected-failure marker, no skip, and an agent that reads `rules-tests.md` must not use it to skip a row or soften a red. The suite is red until every defect it found is fixed; what the closing command reads is the table, so `results` treats a red on a row that expects red as the result the table expects. Everything else in `rules-tests.md` holds, the two Laws above all: every check can fail, and a test asserts the intended behaviour, not today's gap.
  - **Never narrow a promise to fit what was built.** The case's table is the promise. A row id is never removed, renumbered, merged away, reworded smaller, or moved to a list of things left out. If the tests cover less than the table, the tests are short.
  - **Only a test that has run closes a row.** A row is closed in three ways only: the user's strike; a confirmed `CantHappen`; or a confirmed `Test` whose `Ran` is the colour the row expects. A test that exists in a file and has never run does not close it. A test that ran and passed closes a row only if it does what the row's `Test` claim says and asserts what the row's expected fields say. The expected fields are the row's `fill` fields other than `CantHappen` and `Shortfall`.
  - **What the code does today is evidence, its messages included**, and so is whatever the row script prints of them. A message or refusal that breaks a Meridian rule or is plainly wrong is a bug: its test asserts the rule, or the plain reading, and is red. One that no rule covers and that isn't plainly wrong may be a `today` value, labelled. One the filler can't judge goes to the user, quoted, as a question with one recommended answer, which `open` lists: a bug that is written into the code gets through only if nobody reads the sentence.

- **Agents and judgement**

  - **A subagent's report is claims.** A claim is confirmed only by grepping the citation it names: a citation is a file plus a verbatim quote, and the grep is the check. Nothing from a subagent is acted on, passed to another agent, or told to the user as fact until a second agent has tried to disprove it, or the main session has checked it against the code. What wasn't checked is said to be the agent's.
  - **Never justify existing code.** "It works today", "it's consistent with elsewhere", "another test covers it", and "it's minor" are not reasons.
  - **A recommendation is one answer.** Not two readings and "your call". A question goes to the user only where no source in the order answers it, and never about whether to do work the user has already asked for.
  - **Facts with citations; "I couldn't" is an acceptable result.** A subagent reports facts with citations, and "I couldn't, and here is what stopped me" is an acceptable result. The filler runs on the builder route and the disprover on the critic route.

## The records

One set per case, under `<the case's folder>/`. The records **are** the artefact: JSONL only, no markdown document, no generated view. The word "table" survives as the name of the record set.

A case is a folder named exactly `__oracle__`, placed next to what it pins down (beside a page, say). The ledger takes the folder's path and refuses, with exit 2 and nothing written, one whose final folder name is anything else (`__oracles__`, `oracle`). The row script is not in the folder unless the case wants it there, so a script can be shared between cases. The folder has this layout:

```
<the thing the case pins down>         a page, a CLI, a module: the case sits beside it
__oracle__/                            the case folder: named exactly this
  oracle.conf.json                     {"rows": [<the row script's command>]}, written with the user. Committed
  frozen.json                          written only by freeze: {"date", "words", "script": {"file", "sha256"}}. Committed
  rulings.md                           written only by rule: the user's rulings. Committed
  table/rows.jsonl                     written only by the ledger. Committed
  fill/filled/<slice>/fields.jsonl     the filler's. Working file, ignored
  fill/verdicts/<slice>.jsonl          the disprover's. Working file, ignored
  test/filled/<slice>/fields.jsonl     the filler's, for Test. Working file, ignored
  test/verdicts/<slice>.jsonl          the disprover's, for Test. Working file, ignored
  reports/                             every agent's prose report. Working file, ignored
  unplaced.jsonl, results.xml          what a row script or a test run leaves. Working files, ignored
```

The oracle is `oracle.conf.json`, `frozen.json`, `rulings.md`, and `table/`: it is committed. The working files are ignored, in a `.gitignore` inside the `__oracle__` folder that names `fill/`, `test/` (the pass folder, not test sources), `reports/`, `unplaced.jsonl`, and `results.xml`.

**`oracle.conf.json` holds exactly one key, `rows`**: a non-empty list of strings, the row script's command. Any other key, a missing file, text that is not JSON, or a value that is not an object is exit 2 with a named message. The ledger runs the command in the case folder and appends the case folder's absolute path as its last argument, so `["uv", "run", "rows.py"]` runs as `uv run rows.py <absolute case folder>`. Paths in the command are relative to the case folder, so one script can serve many cases: `["uv", "run", "../../../.oracle/page-rows.py"]`. The script uses the case folder's parent to know what it is reading.

**The row script's file** is the first element of the command that names an existing file when resolved against the case folder, scanning left to right: `x.py` for `["uv", "run", "x.py"]`, and `rows.py` for `["python3", "rows.py"]`. `freeze` pins that file in `frozen.json`, as its path relative to the case folder and the sha256 of its bytes.

Nothing is written by hand but `oracle.conf.json` and the row script. The row script decides which rows exist and which fields they carry, and the ledger reads the fields from the rows.

**Each row the script prints carries every field to be filled, present with the value `null`.** A non-null field is the script's own. A field printed as null is a field to fill, and the table keeps it as null until a confirmed value replaces it. There are two passes, fixed:

- `fill` owns every null field the script printed other than `Test`. `CantHappen` and `Shortfall` have the meanings below; every other `fill` field is an expected field, and its values carry `Source`.
- `test` owns exactly the field `Test`, which every row prints as null.

`rows` refuses a row that prints no field to fill, a row that does not print `Test` as null, a row that prints `Gone`, `Ran`, or `Struck`, a `CantHappen` or `Shortfall` that is not null, and an object that has the shape of a merged field, with exit 2 and nothing written.

**Citations are relative to `<root>`.** `<root>` is the folder `git rev-parse --show-toplevel` prints when run in the case folder; when that fails, the case folder itself.

**Three field names have a meaning to the ledger; every other field is the script's.**

- `CantHappen` is the cited chain that shows the row can't happen. A confirmed one closes the row.
- `Shortfall` is what today's code does where it falls short of the row's expected value, cited. A row with a confirmed `Shortfall` expects a red test, and every other row expects a green one.
- `Test` is the claim that the row's test does what the row says and asserts its expected value, citing the test.

The ledger alone writes `Gone`, `Ran`, and `Struck`, and gives a row with no `Slice` the slice `all`.

**The artefacts, by owner.** Agents write only their own folder; the row script only prints rows, the ledger is the sole writer of `table/`, and every merge into it is a deterministic command (`rows` writes the rows the script printed). `filled/` and `verdicts/` sit under a pass's folder, `fill/` or `test/`:

| Path under `<the case's folder>/` | Written by | What it holds |
|---|---|---|
| `oracle.conf.json` | the user and the main session, by hand | the row script's command, as the one key `rows` |
| the row script (in the case folder, or shared) | the user and the main session, by hand | it prints every row, each with every field to fill as null |
| `frozen.json` | the ledger, by `freeze` only | the user's words that the row script is right, the date, and the script's file and sha256 |
| `table/rows.jsonl` | the ledger only | one record per row: the row script's fields, then every merged field (null until merged), `Ran`, and `Gone` or `Struck` where they hold |
| `<pass>/filled/<slice>/fields.jsonl` | the filler (the filler's role file) | one record per (row id, field) for the slice's rows, in one of three shapes |
| `<pass>/verdicts/<slice>.jsonl` | the disprover (the disprover's role file) | one record per (id, field): `Verdict` is one of CONFIRMED, PARTLY, WRONG, CAN'T TELL |
| `reports/*.md` | every agent | prose evidence; each bullet keyed by row id at line start, so `grep -rn <id> reports/` is the join |
| `rulings.md` | `rule` only | the user's rulings, one line each |

**The row record, by owner-field.**

- **Script-owned, rewritten on every run:** `Id`, unique and made from the row's content, never from its position; `Slice`, where the script gives one; and every other field the row script prints with a value.
- **Filler-owned, merged by `merge <case> fill <slice>`:** the fields the script printed as null, other than `Test`. Each merges as the fill record without `Id` and `Field`, and cites its source in `Cites`: a file under `<root>` and a verbatim quote. A field no source answers is a question for the user, with one recommended answer. A value of an expected field carries `Source` (see "Where intent comes from"), and its citations fit it: `written` cites a file that is not the code the row's `Where` points into, not the row script, not `oracle.conf.json`, and not one of the case's own records; `ruling` cites `rulings.md`; `meridian` cites at least one `meridian:<rules-*.md>` file with a quote that is in it; `today` and `judgement` cite the code, and `judgement` adds a non-empty `Why`. `CantHappen` is every link of the chain, cited. No agent adds any record, and none removes one.
- **Pass-owned, merged by `merge <case> test <slice>`:** the `test` pass appends `Test` the same way, so a row with no test is visible to `open`.
- **Ledger-owned, from the test results:** `Ran`, one of `green`, `red`, or `not-run`, written by `results` on every row from the JUnit files alone. A row closes on a `Ran` equal to the colour it expects; every other value leaves it open.
- **User-owned:** `Struck` with the user's words and the date, via `strike <case> <id> --why "…"` — the user's words travel as a command argument; nobody else strikes. Rulings travel the same way, via `rule`, into `rulings.md`, and so does the freeze, via `freeze <case> --words "…"`, into `frozen.json`.

**Citations.** An agent's citation is a file plus a verbatim quote — a grep-able anchor, never a line number: line numbers rot and quotes grep, so verification is one grep in the named file, and the ledger does that grep, with whitespace runs compared as one space. Script fields (`<the script's own field>`) keep `file:line`, because those lines do not rot. There is no second tier of claim: a claim carries its citation or it is refused. `CantHappen` requires every link of its chain cited; one missing link makes the row able to happen, full stop. "Unable to prove" is not a field value: the field stays empty and the row stays open. `CAN'T TELL` survives only as a disprover's gate verdict meaning *don't merge*.

**Verdict gating is the whole trust model.** `merge <case> <pass> <slice>` appends `CONFIRMED` fields only; PARTLY, WRONG, and CAN'T TELL leave the field empty, which leaves the row open, which sends the work back through the loop. Laziness has a shape: an open row.

**The row script is frozen: it finds what it finds.** A thing in what the rows are read from that no row holds, and that the script's stderr does not name as left out, is a **finding for the user**, in a report's Missed list, with the file and the quote; the script is never repaired mid-loop. What the script prints (what it read, what it left out, and why) is command output on stderr, and what it can't place goes to a file.

**Re-runs are a key-preserving merge:** `rows` rewrites the script's own fields and keeps every merged field and every `Struck`. A row the script stops printing stays, marked `Gone`, and is open until the user strikes it. A merged field whose quote is no longer in its file is set back to null, and the row reopens, so the promise can never quietly shrink.

**The invariant the machinery keeps.** Every row is written by the row script through `rows`, and no agent adds, removes, merges, splits, or rewords one. A field reaches the table only through `merge`, on a `CONFIRMED` verdict that quotes the fill it judged, and leaves it when its quote no longer greps. A row is closed only by a confirmed test whose run gave the colour the row expects, a confirmed can't-happen chain, or the user's strike. `open`'s output is the only statement of where a case stands, and its exit 0 is the only done.

## The ledger

Each command is run as `node <skill>/scripts/ledger.mjs` with its subcommand and arguments. Exit codes: 0 fine; 1 a gate is red; 2 an input can't be read or is malformed, and then nothing is written. What a command refuses, and why, is the implementation's to say: it names each problem, and its schemas and error messages are the spec for what it accepts and refuses.

**A fill record** is one line of `<pass>/filled/<slice>/fields.jsonl`: `Id`, `Field`, and exactly one of three shapes. A value has at least one citation, a file and a verbatim quote of 3 characters or more; the file is under `<root>`, or is `meridian:<rules-file>` for a Meridian rule. A value of an expected field also has `Source`, and `Why` when `Source` is `judgement`. A question is for the user, with one recommended answer. Empty says what stopped the filler.

```jsonl
{"Id": "<row id>", "Field": "<field>", "Value": "<text>", "Source": "written", "Cites": [{"File": "<path relative to the root>", "Quote": "<verbatim>"}]}
{"Id": "<row id>", "Field": "<field>", "Value": "<text>", "Source": "meridian", "Cites": [{"File": "meridian:<rules-*.md>", "Quote": "<verbatim>"}]}
{"Id": "<row id>", "Field": "<field>", "Value": "<text>", "Source": "judgement", "Why": "<one sentence>", "Cites": [{"File": "<code path relative to the root>", "Quote": "<verbatim>"}]}
{"Id": "<row id>", "Field": "<field>", "Question": "<text>", "Recommend": "<one answer>"}
{"Id": "<row id>", "Field": "<field>", "Empty": "<what stopped the filler>"}
```

`Source` is `written`, `ruling`, `meridian`, `today`, or `judgement`; the first line above is the `written` shape, and `ruling` and `today` take the same shape with their own word and citations. There is no other kind of source: a web page is saved to a file and cited there, the user's ruling is cited from the case's `rulings.md`, and a Meridian rule is cited from its `rules-*.md` file in `<skill>/references/`.

**A verdict record** is one line of `<pass>/verdicts/<slice>.jsonl`: `Id`, `Field`, `Verdict` (one of `CONFIRMED`, `PARTLY`, `WRONG`, `CAN'T TELL`), `Evidence`, and `Judged` (the fill record it judged, without `Id` and `Field`).

**Tests name their rows.** A test names the row whose id equals the test's name, compared lower-case with only letters and digits — equality, not containment. The test's name is the row's id in snake_case, PascalCase, or camelCase, or the id verbatim as the test's string, so the id `greet.no-person.exit-2` is named by `greet_no_person_exit_2`, `GreetNoPersonExit2`, `greetNoPersonExit2`, and `greet.no-person.exit-2`, and by nothing else. `results` reads the JUnit XML files of one whole run. The ledger does not run tests: a case's Proof is `results`, never the test runner's own exit code, because a runner exits 1 when a red-on-purpose test fails.

The eight commands — what each does, what it writes, and when it exits:

- `freeze <case> --words "<the user's words>"` writes `<case>/frozen.json` — `{"date": "<today>", "words": "<the user's words>", "script": {"file": "<the row script's file, relative to the case folder>", "sha256": "<hex of its bytes>"}}` — and it is the only writer of that file. It exits 2 and writes nothing when no element of the rows command names an existing file, or the words are empty.
- `rows <case> [--draft]` runs `<the row script>` and merges what it prints into `table/rows.jsonl`; a re-run is a key-preserving merge, as "The records" says. It exits 1 and writes nothing when the script no longer matches the pin in `frozen.json`, naming the change; with `--draft`, or with no `frozen.json`, it prints the rows and writes nothing (exit 0 with `--draft`, exit 1 without it). It prints the freeze, and counts: rows, new, gone, and fields emptied.
- `check <case> <pass> <slice>` is the parity gate on a fill; `<pass>` is `fill` or `test`. It writes nothing, and exits 1, naming each problem by `Id` and `Field`, until every record and every quote holds; the gate's list is in the filler's role file, "The parity gate".
- `merge <case> <pass> <slice>` runs the parity gate first, and exits 1 if it is red. It writes `table/rows.jsonl`: a field becomes its value when the verdict is `CONFIRMED` and `Judged` equals the fill record without `Id` and `Field`, and is set back to null otherwise; an `Empty` record changes nothing. It exits 2 and writes nothing when the verdicts file is missing, or its records are malformed, or name an (`Id`, `Field`) the fill does not hold. It prints how many fields merged, and how many stay empty.
- `results <case> <file>… [--slice <slice>]` reads the JUnit XML files of one whole run, writes `Ran` on every row from these files alone, and a test that names no row is no error. It then judges the rows in scope (the slice, or every row) that are ready for a test — not struck, not `Gone`, with no confirmed `CantHappen`, and holding a value in every `fill` field other than `CantHappen` and `Shortfall` — and exits 1, naming each ready row that has no run result, was skipped, or ran a colour the table does not expect; the rows not ready are printed, with the field that is missing or is a question, and they do not change the exit code.
- `rule <case> <id> <field> --words "<the user's words>"` appends one line to `rulings.md`, `- <date> · <id> · <field>: <the user's words>`, and changes nothing in the table. It exits 2 when the id is not a row, or the field is not a field to fill on it. A question with a ruling stops being a question for the user: `open` lists its row as unfilled, and the filler is sent again for that pass and slice.
- `strike <case> <id> --why "<the user's words>"` sets `Struck` to the user's words and the date in `table/rows.jsonl`. It exits 2 without writing when the id is not a row.
- `open <case>` writes nothing. It prints every open row by id with its reason, the rows for the user (a question with no ruling), and the expected values that rest on today's code, as "Saying where a case stands" says; a table with no rows is not done. It exits 1 when any row is open, else 0.

## The loop

One case at a time. The main session dispatches role files, runs commands, and relays their output: it writes nothing into the table and claims nothing about it — the commands' exit codes are its voice. The filler runs as a *builder* and the disprover as a *critic*, the roles the user's instructions list under "Subagent models": start each on the model and effort those instructions give its role, with all three of provider, model, and effort named in the call where the agent takes them. This skill names no model of its own. Each subagent saves its report with a shell heredoc to the absolute path in its prompt and replies with only the path.

A role file in `<skill>/references/` is one first sentence for you, a `---` line, and then the prompt. Read the built role file, send everything below the line, word for word, and fill only the parts in `<angle brackets>`. Start each subagent fresh: a new agent that has only that prompt, not a fork of this conversation.

Check you can start subagents. If you can't, say so and stop.

### 1. Scope

Agree with the user what a row is and what the rows are read from. It is said in the conversation; nothing is written to a file. Ask which kind reference applies, if the work has one.

Done when: the user has said it is what they meant.

### 2. The row script

Write the row script with the user: in the case folder, or shared with other cases, in which case a path in its command reaches it. Put its command in `<case>/oracle.conf.json`, as `{"rows": [...]}`. The script takes the case folder's path as its last argument and uses the case folder's parent to know what it is reading. It reads its source with a real reader for that format (rule 4). It prints every row with every field to fill as null, `Test` included. Show its rows with `node <skill>/scripts/ledger.mjs rows <case> --draft`, and fix the script until they are the rows the user wants and the fields they want filled. Only when the user says it looks right, run `node <skill>/scripts/ledger.mjs freeze <case> --words "<the user's words>"`. A miss found later goes to the user; nobody quietly repairs the script. When the user says so, send `<the disprover's role file>` at the row script: it reads the row script and what the rows are read from, lists what the script misses, misreads, or numbers by position, and writes a report and no verdicts file.

Done when: `<case>/frozen.json` holds the user's words, the date, and the row script's pin.

### 3. The table

Run `node <skill>/scripts/ledger.mjs rows <case>`. It writes the records:

```bash
node <skill>/scripts/ledger.mjs rows <case>
```

The script's stderr names what it left out. Each miss is a finding for the user. If the command refuses (exit 1) because the row script changed since the freeze, tell the user and show them the change; the script is frozen again only on the user's word, with `freeze`.

Done when: the command exits 0 and has printed the counts.

### 4. Fill, disprove, merge

Run the `fill` pass now. The `test` pass comes in step 7, after the tests have run. For a pass and each slice of the table, run the loop once:

1. Send `<the filler's role file>`, one per slice: it fills the pass's fields for every row of the slice, in `<pass>/filled/<slice>/fields.jsonl`. For `fill`, those are the fields each row printed as null, other than `Test`. It decides no row. What the records are missing — a thing the row script should have written as a row — is the report's Missed list: findings for the user.
2. The parity gate is a command: `node <skill>/scripts/ledger.mjs check <case> <pass> <slice>`. It exits 1 until every record and every quote holds, as the filler's role file lists in "The parity gate".
3. Then `<the disprover's role file>` on each report. It tries to disprove every value and question record of the fill, and what was missed. The disprover verifies every citation by grepping the quote in the named file, writes its prose evidence into `reports/`, **and** writes `verdicts/<slice>.jsonl` — one record per (id, field).
4. The merge is a command: `node <skill>/scripts/ledger.mjs merge <case> <pass> <slice>` appends `CONFIRMED` fields only.

Done when: `check` exits 0 and `merge` has run for every slice of the pass, and every Missed finding is named to the user.

### 5. Present

Run `node <skill>/scripts/ledger.mjs open <case>` and relay its output. Put each question for the user to them with its one recommended answer. Record their answer with `node <skill>/scripts/ledger.mjs rule <case> <id> <field> --words "<the user's words>"`. The user strikes a row, nobody else: `strike <case> <id> --why "…"`; their words travel as the argument, and `Struck` closes the row. After a `rule`, run step 4 again for that row's pass and slice.

`open <case>` names every open row, by id, with its reason, and sends the work back: to step 4 if a field is unfilled, or a question has been ruled; to steps 3 and 4 if a field is stale, because `rows` sets it back to null; to the user if a row is gone from the row script or is a question for the user, or if the table has no rows (the row script printed none, which is a finding for the user); to step 6 if the case has no spec yet and a row has no confirmed test; to step 7 if the tests are built and a row has no run result, or ran a colour the table does not expect. Then run step 7 again.

Done when: every row `open` named has been answered, struck, or sent back, and the user has seen the output.

### 6. The pre-spec step

When the `fill` pass is merged (a row that is still a question for the user does not hold the step back), read `<skill>/pre-spec.md` in full, and tell the user to run `/spec`, naming the case folder and that file as the work. `/spec` and `/go` run in the user's own session, unchanged.

Before anything is built, `/spec`'s cold reader reads the spec cold against the table and the written sources, row for row. Whoever writes the spec checks what it relies on against the code, then sends corrections back into the spec. A correction never removes a row, and never changes what a test expects to match the code. The check is done when every finding is fixed in the spec, or is a question for the user, or is named to the user as not taken with the reason; and the user has answered the questions.

Done when: you have read `pre-spec.md` in full and told the user to run `/spec`, naming the case folder and that file.

### 7. After /go and /cycle

`/go`'s builders write the tests from the spec, and `/cycle` reviews them; this skill changes neither. Each builder proves every new test can fail, runs its file, and reports each place the code and the row disagreed. The build is done when every row is in a piece of the spec or is an open ask, and each builder's report lists its reds and its mutations.

Then run the case's tests as its spec says, with JUnit output, and keep the results files. Run `node <skill>/scripts/ledger.mjs results <case> <the run's JUnit files> --slice <slice>`; it writes `Ran` on every row. Then run the `test` pass as step 4 does: the filler finds each row's test and claims that it does what the row says, citing it, and the disprover grades each claim. `merge` appends the confirmed `Test` into each row it covers, and nothing else; the main session writes no result of its own. Then present again, as step 5.

Done when: `results` has run on every results file of the run, and `merge` has run for every slice of the `test` pass.

The case is finished when `open <case>` exits 0. Only then is another case started.

## Saying where a case stands

`open <case>` is the statement. Its output is every open row, by id, each with its reason — gone, stale, unfilled, no confirmed test, no run result, ran the wrong colour — plus the rows it lists for the user (a question with no ruling) and the fields it lists as expected from today's code. No total or summary in the main session's own words in place of the list. Its exit 0 is the only statement in the system that a case is finished; exit 1 names what is left.
