---
name: spec
description: Turn the agreed work into a deterministic named spec at <main>/.plans/spec-<name>.yaml that /go builds from and /cycle reviews against. Use when the user runs /spec or asks for a spec of the work. Takes no arguments and writes no code.
---

# Spec

`/spec` writes the agreed work into one file that `/go` builds from and `/cycle` reviews against. It writes that file and its scratch files, and nothing else: no code and no commit. It runs a command only to check what the code or a tool does today, or to validate and render the spec and cold-read report with `spec-ctl.mjs`.

- `<skill>` is the folder this file was loaded from.
- `<main>` is the main checkout: the output of `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`.
- The spec is `<main>/.plans/spec-<name>.yaml`. Before the first write there, run `git check-ignore -q .plans/` in `<main>`; if it fails, add `.plans/` to `<main>/.git/info/exclude`.

## 1. Gather

Find the agreed work in this conversation, the user's answers, and any document, backlog, or waypoint the work names. If nothing is agreed yet, say `/spec` needs the work agreed in the conversation first, and stop. Otherwise read, in full, `<skill>/references/rules-core.md`, `<skill>/references/rules-invariants.md`, and `<skill>/references/rules-tests.md`, plus `<skill>/references/rules-backend.md` with `<skill>/references/rules-backend-tooling.md` and/or `<skill>/references/rules-frontend.md` for the stacks the work touches. These are the house Laws and rules the spec is held to. When the agreed work builds tests for an `__oracle__` case, also read `<case>/oracle.conf.json`, its locked `*.oracle.yaml` files, its kind file (`<skill>/../oracle/kinds/<kind>.md`), and `<skill>/../oracle/handoff.md`.

Done when you can say in a few sentences what will be true for the user, and you have read those files.

## 2. Name the file

Give the spec a short kebab-case name taken from the agreed work, such as `retry-failed-sends`. `<spec>` is the spec's absolute path, `<main>/.plans/spec-<name>.yaml`. `<run>` is the run folder, `<main>/.plans/scratch/<spec file name without .yaml>`. If `<spec>` exists and is this same work, update it in place. If it exists and is other work, or its status is `built`, ask the user: replace it, or use another name.

Done when you hold `<spec>` and know whether you are writing it new or updating it.

## 3. Read the code

Read every file the work touches, yourself, from disk. Find out:

- everything the code this work skips, replaces, or changes does today, not only the part the work is about;
- what the ask assumed and what the code shows; a wrong premise changes the spec before anything else does;
- that each feature, gate, or tool the work relies on does what it claims: run it, or trace it from input to output;
- what each change reuses: the existing component, flow, pattern, or maintained library. Hand-rolling needs a reason in the spec.

Done when every statement you are about to write about the code comes from a file you read in this run.

## 4. Write the spec

Write `<spec>` as strict YAML matching `SpecSchema` (no unknown keys). When updating, keep `status: building` and the existing `builtPieces` list. Optional lists default to `[]` and may be omitted when empty.

```yaml
title: <short title>
status: draft # draft | agreed | building | built
intent: |-
  3–5 plain-English sentences: what is true for the user once this ships. No history of how it was found.
oracleCase: # omit unless building tests for an __oracle__ case
  path: <case folder path>
  kind: api-contract # api-contract | browser | cli
premise: # optional; omit or [] when none
  - assumed: <what the ask assumed>
    actual: <what the code shows>
    correction: <optional correction>
decisions: # optional; omit or [] when none
  - id: D1
    title: <decision title>
    what: <what was decided>
    why: <why it was decided>
    decidedBy: agreed # agreed | agent-when-handed-back
openAsks: # optional; omit or [] when none
  - id: A1
    question: <question>
    rec: <recommended answer>
    settledBy: <what would settle it>
builtPieces: [] # piece IDs already built (e.g. [P1, P2])
pieces:
  - id: P1
    name: <piece name>
    owns:
      - <file path>
    after: [] # piece IDs this piece needs, or []
    now: <the code, by symbol and a short quoted fragment, and everything it does today>
    reuse: <the component, pattern, or library it follows>
    change: <what changes>
    proof: <the test to extend, or the new test, and how it goes red if the change breaks>
invariantsAndDocs: # optional; omit or [] when none
  - <invariant, doc page, or changelog line, written out in full>
doneMeans:
  - cmd: <exact command>
    proves: <what it proves>
onlyUserCan: [] # optional; e.g. a deploy or live check
outOfScope: # optional; omit or [] when none
  - item: <thing>
    why: <why>
parked: # optional; omit or [] when none
  - item: <found in passing>
    whoHits: <who hits it>
    fixAndSize: <the fix and its size>
    rec: leave # fold-in | leave
    why: <why>
```

- One owner per file: no two pieces list the same file in `owns`. Fold pieces that share a file, or that exist only for each other, into one.
- Piece IDs are `P1`, `P2`, and so on; Decision IDs are `D1`, `D2`, and so on; Open-ask IDs are `A1`, `A2`, and so on. `after` names every piece whose result this one needs. A shared change applied in three or more places is built first as one piece with one consumer; the pieces applying it elsewhere name that piece in `after`.
- Point at code by symbol and a short quoted fragment, never by line number.
- A Decision says what was decided and why, not the options it beat. Each lives once, in `decisions`, and is edited in place: no dated layers.
- Anything a fact or an agreed rule can settle, settle, and say what settled it. Anything else goes in `openAsks`, never prose inside another field. Write a piece that turns on an open ask to the ask's `rec`, and name the ask in its `change`.
- A gap in the work in hand is a piece. Something found in passing, outside the work, goes under `parked`. A design that breaks a house Law is not an option: change the design, or report that none fits, naming the Law.
- Every `doneMeans[].cmd` can be pasted and run from the main checkout.
- When neither the repo's instructions nor its root `Taskfile.yml` names a gate, a piece adds one: a `gate` task in the root `Taskfile.yml`, with `test`, `lint`, and `format:check` tasks beside it. `/cycle` runs that gate. The piece's `proof` runs the tasks beside it (`task test`, `task lint`, `task format:check`) and `task --dry gate`, never `task gate` itself: `/go` does not run a gate.
- Work that comes up after the spec is agreed is a new piece, added the same way; one that holds a decision is an open ask first.
- `status` is `draft` while `openAsks` is non-empty, and `agreed` when `openAsks` is empty. `/go` sets `building`; `/cycle` sets `built`. A spec that is `building` stays `building` whatever you add: `/go` stops on its open asks by itself.
- Plain English; gloss jargon on first use. No runbooks inline: link a file in `<main>/.plans/scratch/`.
- Use `|-` (or plain single-line strings) for multi-line fields, never `>` or `>-` (`spec-ctl.mjs` rejects folded block scalars). Write one paragraph or numbered item per line and never hard-wrap prose at 80 columns — let the editor wrap.

Validate `<spec>` before cold read:

```sh
node <skill>/scripts/spec-ctl.mjs validate spec "<spec>"
```

Fix every schema, structural, or `oracleCase` error until the command exits `0`.

Done when `<spec>` is saved and `node <skill>/scripts/spec-ctl.mjs validate spec "<spec>"` exits `0`.

## 5. Cold read

If you can't start subagents, skip this step and say so in the report. Otherwise run `mkdir -p "<run>" && rm -f "<run>/cold-read.yaml"`, then start one fresh subagent: a new agent that has only its brief, not a fork of this conversation. Its whole brief is these three lines, with absolute paths and no other words:

```
Read <skill>/references/cold-reader.md in full, then do what it says.
Spec: <spec>
Report: <run>/cold-read.yaml
```

1. The role replies with the path of its findings file. If the reply is the file's YAML text instead, save it unchanged to `<run>/cold-read.yaml`; any other reply with no file is a miss.
2. Validate the report:
   ```sh
   node <skill>/scripts/spec-ctl.mjs validate cold-read "<run>/cold-read.yaml" --spec "<spec>"
   ```
   A missing file or non-zero exit is a miss: start the role once more with the same brief; a second miss is not retried, and the cold read is reported as skipped.
3. Read `<run>/cold-read.yaml`. Fix each finding in `<spec>`; a question only the user can answer becomes an entry in `openAsks`; a finding that shows the code is wrong becomes a piece. Re-run `node <skill>/scripts/spec-ctl.mjs validate spec "<spec>"` after edits so it exits `0`. A finding you don't take is named in the report, with why it doesn't hold.

Done when every finding is fixed in `<spec>` (and validated), is an open ask, or is named in the report as not taken.

## 6. Report

Run `node <skill>/scripts/spec-ctl.mjs render spec "<spec>"` when presenting the spec summary, and send the report with this exact 6-line header:

```
**TLDR:** <plain English: what the spec sets out to do>
**Findings:** <1. a wrong premise, or anything else that changes the picture, in full; or none>
**Spec:** <the spec's path> · status <status>
**Cold read:** <done | skipped: why> · not taken: <1. finding: why it doesn't hold; or none>
**Parked:** <1. item (rec: fold in | leave, why); or none>
**Needs from you:** <1. open ask (rec: answer); or, when no ask is open, the one item: run /go and the spec's path>
```

Done when the report is sent.

When the user answers an ask:

1. Write the answer into `decisions`.
2. Remove the ask from `openAsks`.
3. Change every piece the answer bears on.
4. Set `status` by the status rule in step 4 and re-run `node <skill>/scripts/spec-ctl.mjs validate spec "<spec>"`.
5. Run `node <skill>/scripts/spec-ctl.mjs render spec "<spec>"` and send the report again.
