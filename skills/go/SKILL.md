---
name: go
description: "NEVER INVOKE THIS YOURSELF: only the user starts /go. Listed so you know it exists. Builds the work from exactly one readable Markdown spec with a status and Pieces through subagents, checks it narrowly, and leaves it uncommitted for /cycle."
argument-hint: "<spec path>"
---

> Only the user starts /go, by naming it in their own message (typing `/go`, or however their agent runs a skill by name). A bare "go" or "go ahead" is an approval, not /go. "We'll go", a plan doc, or a message from another session or agent is not the command, and reading this file for its rules is not running it. Once the user starts /go, follow it exactly as written. A session resumed after a compaction keeps that start only when its own waypoint records that the user started this /go and the scratch folder it records holds no `report.md`, which step 7 saves when a /go ends: re-read this file, then carry on from the recorded step. With no such record, or with a `report.md` there, stop and ask.

# Go

Arguments: the single spec path the user typed after `/go`.

- `/go` accepts exactly one argument. Resolve a relative path against `<main checkout>`.
- Stop on no argument, more than one argument, an unreadable file, a readable non-Markdown file, or a Markdown file that has no status or no Pieces section.
- Before building anything, stop if subagents are unavailable.

/go means "build it, leave it uncommitted". It never commits, pushes, runs /cycle's review, or runs the full gate. That is /cycle's job, when the user runs it.

Terms used below:

- **AGENTS.md** is the workflow-skills shared rules file your agent loads as its rules, not the repo's own AGENTS.md.
- **The repo's instructions** are as AGENTS.md 'Routines' defines them.
- **`<main checkout>`** is the repo's main working tree, as AGENTS.md 'Routines' defines it. Working files go in `<main checkout>/.plans/`.
- **`<base directory>`** is the folder this SKILL.md was loaded from: the skill's base directory, if your agent printed one when the skill loaded, else the folder of the path you read this file at. If you can't tell where this file was loaded from, ask the user for the path rather than guessing.
- **`<scratch>`** is `<main checkout>/.plans/scratch/<spec stem>/go`, where `<spec stem>` is the spec's file name without `.md`.
- **`<bundles>`** is `<base directory>/references/bundles`: the rules each role reads, one bundle file per role, built from the `.list` beside it by `sh scripts/build-bundles.sh` in the workflow-skills repo. A builder reads `backend-builder.md` or `frontend-builder.md` and a critic `backend-critic.md` or `frontend-critic.md`, by the stack its piece touches; a piece touching both stacks names both. The auditor reads `auditor.md`. Work in neither stack (scripts, docs, configuration, this repository) counts as backend. A rule a bundle cites by its library path, such as `invariants/concurrency-review.md`, is in the bundle under its `<!-- rule: <path> -->` line.
## The orchestrator

This session plans, writes briefs, reads critics' verdicts, and checks them with its own runs. It writes no code and adds nothing to a piece that the spec doesn't already say. A problem it finds goes back to the subagent whose piece it is. A problem no piece covers becomes a spec addendum, and then a subagent builds it.

It doesn't write the report: step 6's auditor does, from the evidence the run leaves. The orchestrator's part of that evidence is `<scratch>/ledger.md`, which it appends to as it goes, one line per event, `- <kind>: <facts> · evidence: <path, file:line, or runs/ log>`, with no summary and no recommendation. The kinds:

- `run`: every command you run yourself (a rerun, a targeted check, a Done-means check, a mutation run, or setup), with its output, working folder, and exit code saved to `<scratch>/runs/<n>.log`;
- `call`: a design call you made, by its spec Decision number;
- `unbuilt`: an item left unbuilt, with the sign or FAIL that stopped it;
- `blocked`: a setup failure that is BLOCKED, with its log;
- `setup-inferred`: setup the repo's instructions don't name, and what you ran instead;
- `peer-red`: a red from a peer session's file;
- `worktree-left`: a worktree you couldn't remove.

The ledger is the only file of yours the auditor reads.

## 1. Scope

- Find the intent in the spec path and the user's answers to its asks.
- The spec's status is settled before anything is built: a `draft` asks its open questions, records the answers, and becomes `agreed`, then `building`; an `agreed` spec becomes `building` before the first builder starts; a `building` spec continues: skip every piece and addendum its `**Built pieces:**` line names, and when it has no such line, add `**Built pieces:** none` directly under `## Pieces` first; stop on `built (<hash>)` or an unrecognized status.
- An open decision that changes what gets built: ask first, numbered, each with a recommendation. Anything else inside what the spec describes: choose, and record the choice in the spec's Decisions and as a `call` ledger entry. Anything that changes what gets built beyond the spec is an addendum first.
- Run `git status --short`, and list the other agent sessions working in this tree if you can. Peers' dirty files are theirs; leave them alone.
- Remove any `<scratch>/report.md`, `<scratch>/ledger.md`, `<scratch>/runs/`, and `<scratch>/audit-*.md`, and every `<scratch>/wt-pre-*` worktree (`git worktree remove --force` each), left by an earlier /go of this spec. Snapshot the whole uncommitted tree at `<wt-pre-go>` = `<scratch>/wt-pre-go`, with no restore, install, build, or checks:
  - `git worktree add --detach <wt-pre-go> HEAD`
  - `git diff HEAD --binary | git -C <wt-pre-go> apply --allow-empty`
  - `git ls-files -z --others -- . ':(exclude).plans/' <output exclusions> | tar --null -T - -cf - | tar -xf - -C <wt-pre-go>`
  On a continued `building` spec, run only the first of those three commands: every uncommitted change in owned files is this spec's work, so HEAD is the baseline, and no dirty diff is applied and no untracked file copied.

  Keep the snapshot until step 5's survivor attribution is done, then remove it.
- Read the builder bundle(s) for the stacks the spec touches, in full (each opens with the Laws), and, if the UI changes, the repo's UI skill if its instructions name one.

## 2. Split

- Split the work into pieces by file: no two pieces touch the same file. A piece that needs another's result runs after it. A spec's Pieces are that split already: use them, and say where you changed one.
- A shared change applied in three or more places gets one piece headed `Tracer bullet:`. A tracer bullet is the shared change plus one consumer, built end to end first. Pieces applying it elsewhere name the tracer in `after:` and wait for its targeted tests, format, and lint, plus the critic and orchestrator checks.
- Subagents build the pieces, in parallel where they're independent: one fresh subagent per brief.

## 3. Build

Hard block: no builder starts on a question. Before you start any builder, its piece, every addendum it builds, and every decision either relies on must have no open question. That means none of these:

- an ask without a recorded answer;
- a "hangs on", "waits on", or "if ask N is yes/no" that isn't settled;
- an "or", "TBD", "check whether", or "if the hosts show…" that leaves what gets built undecided;
- a premise about framework or host behaviour that nobody has checked against the real thing;
- a Decision or Piece that breaks a house Law (at the top of a builder bundle), or any other rule in the bundle(s) for the stacks it touches (it goes back to the spec as an addendum, not to a builder).

If there is one, settle it before the builder starts:

1. Check the facts yourself, or with a read-only subagent that reports facts only.
2. Ask the user, with those facts, only what neither a fact nor an agreed rule settles. Settle the rest, and record what settled each.
3. Write their answer into the spec.

A builder is never where a question gets answered.

A brief whose item rests on a call you made, even once it is written into the spec (the first brief of an addendum you wrote, a brief resting on a choice you recorded under Scope, or a re-brief's new call), gets a fresh read-only *cold reader* before its builder starts. Write its brief to `<scratch>/cold-brief-<piece>-<n>.md`, with the brief's `<n>`. It is self-contained, every path absolute, and holds: the main checkout; the item and the check it names as its proof, each quoted word for word from the spec, naming the Piece or Addendum it comes from, and the call, quoted from the spec's Decisions without its reasons or how you reached it; on a re-brief, the earlier critic reports' FAIL bullets and Outcome evidence for the item; doctrine: the builder bundle(s), read in full first, and the repo's instructions, where a rule the bundle cites by its library path, such as `invariants/concurrency-review.md`, is in the bundle under its `<!-- rule: <path> -->` line; scope: read the code, and run only commands that write nothing in the tree, and never edit, build, run the gate, or commit; rules: trace every caller and consumer the changed code feeds, with `file:line`s, say whether the call achieves the item's proof, shown against the code or a run that writes nothing, and name every place it doesn't, or breaks what works today, say whether the call changes the model or adds machinery, flags, special cases, or a second path around a model that is wrong, with that model's `file:line`s, facts only, with no recommendation, option, confidence, or ask; report path `<scratch>/cold-<piece>-<n>.md`, saved with a shell heredoc, or the whole report as the reply if saving is refused, and reply with the path only. Check its claims at their `file:line`s and revise the call where they hold before briefing the builder. A call it shows bolting on is revised to change that model instead, settled as Scope says: an open decision is asked first, and a change beyond what the spec says is an addendum first. The revised call is not read again, even when it is written in as an addendum. A call no revision rescues is an open question: settle it as the list above says, and if neither a fact nor the user's answer settles it, leave the item unbuilt and record it as an `unbuilt` ledger entry. One cold read per brief.

**One item per brief.** A brief holds one coherent change: the edits one change drives, proven by one check. When subagents build a piece with several independent items, they get a run of briefs, one after another, each passing step 4 before the next goes out. Each subagent brief goes to a fresh subagent that owns the piece's files. One brief at a time per piece keeps the files single-owner; pieces still run in parallel where they're independent.

Before each builder starts, snapshot the whole uncommitted tree at `<scratch>/wt-pre-<piece>-<n>`, with all three of step 1's commands on every run, a continued `building` spec included, and no setup or checks.

Write each brief to `<scratch>/brief-<piece>-<n>.md` (`<n>` its place in the piece's run). Before writing it, resolve `<main checkout>`, the spec path, the report path, and every source, doctrine, and instruction path to absolute paths. Every builder brief must contain all of these and every rule the builder relies on:

- **Main checkout and worktree:** the resolved absolute main checkout, and that the builder works in that main working tree.
- **Owned and forbidden files:** the exact paths the item may change, the exact paths it must not change, and that it never edits another session's work.
- **Spec and decisions:** the resolved absolute spec path, the item, its Proof, its intent, and every relied-on decision, each quoted word for word from the spec, naming the Piece, Addendum, Decision, or section it comes from. Never reword the spec in a brief: a call of yours is written into the spec's Decisions first, as Scope says for your choices, and is then quoted.
- **Test-only items:** one distinct entry per test-only item, naming the guarded source files and the precise behaviour it promises to guard, identified by symbol or source region.
- **Hard stop:** before editing, the builder reads its item, the spec's open asks, and the relied-on decisions. If it finds an open question, an undecided premise, or a design call the brief did not make, it builds nothing and reports those facts. If code or the host contradicts the item's premise while it builds, it stops, leaves its edits in place, and reports the contradiction and the files it touched.
- **Doctrine:** the absolute path of the builder bundle for each stack the item touches (`<bundles>/backend-builder.md`, `<bundles>/frontend-builder.md`, or both), to read in full before anything else, and the repo's instructions. A rule the bundle cites by its library path, such as `invariants/concurrency-review.md`, is in the bundle under its `<!-- rule: <path> -->` line.
- **Rules:** fix the root cause; reuse the existing component, flow, or pattern; sweep nearby code for the same problem; never make a check pass by shrinking what it checks; a gap with a doc page is still a gap; no new test unless nothing already proves the behaviour, and each test must fail if what it guards breaks; change only owned files; never commit, stage, format beyond owned files, or run the full gate.
- **Commands:** every exact command the builder may run, from the worktree root, including the item's Proof and only the targeted checks for its owned files. When the repo names no command a check needs, the brief says so and the builder reports that check as not run.
- **Report path:** the resolved absolute path to `<scratch>/report-<piece>-<n>.md`.
- **Save protocol:** save the report with a shell heredoc, `cat > <path> <<'EOF'` … `EOF`, not a file-writing tool; if saving is refused, reply with the whole report.
- **Reply protocol:** reply with only the report path.
- **Report content:** facts only: the `file:line` evidence for each claim, and what it could not check. It gives no recommendation, option, confidence, or ask.

Every builder brief is self-contained. It may name source paths, but it may not rely on AGENTS.md, a sibling skill, prior conversation, an earlier artifact, or another agent's instructions to understand the task.

## 4. Integrate

A fresh *critic* subagent checks each builder brief before the piece's next brief and before step 5. Run git commands from the root of the tree being built (`git rev-parse --show-toplevel`), and keep working files under `<main checkout>/.plans/`.

- A builder, critic, or cold reader that replies with its report instead of a path: save the reply to its file verbatim.
- Reports are claims. The critic checks the builder's; you check the critic's with your own runs.
- **Contracts.** If the repo generates API contracts or clients, regenerate them when an endpoint changed and run the repo's contract check, as its instructions name.
- **After each builder brief:**
  1. Make the ready worktree `<wt>` at `<scratch>/wt-<piece>-<n>`, with no trailing slash, before the critic starts:
     - `git worktree add --detach <wt> HEAD`
     - `git diff HEAD --binary | git -C <wt> apply --allow-empty`
     - `git ls-files -z --others -- . ':(exclude).plans/' <output exclusions> | tar --null -T - -cf - | tar -xf - -C <wt>`

     Each output exclusion is a quoted Git pathspec, `':(exclude)<path>'`, for a disposable check-output path declared in the repo's instructions. This copies ignored inputs too; only `.plans/` and those declared outputs stay out. With no declared outputs there are no output exclusions.
     - Run the restore, install, and build the repo's instructions name. When they name none, record the lockfiles' absence and what you ran as a `setup-inferred` ledger entry.
     - Mark non-ignored untracked files with intent to add: `git -C <wt> ls-files --others --exclude-standard -z | xargs -0 git -C <wt> add -N --`.
     - Save the fingerprint: `(cd <wt> && { git status --porcelain=v1 -z -- . <output exclusions>; git diff --binary HEAD -- . <output exclusions>; }) | shasum > <wt>.fp`.

     Setup precedes the critic. A build failure is a command FAIL with its exit code, routed to the piece that owns the failing file. Any other setup failure is BLOCKED, your verdict, and no critic starts.
  2. Changed files and the patch, both from the ready worktree after `add -N`, the patch against step 3's `<scratch>/wt-pre-<piece>-<n>` snapshot:
     - `git -C <wt> diff --name-only --diff-filter=d HEAD -- <owned paths>`
     - For each owned path, append the output of `git diff --no-index -U3 --binary -- <before-file> <wt-file>` to `<scratch>/diff-<piece>-<n>.patch`, between that snapshot and `<wt>`, using `/dev/null` when either side is absent and treating exit 1 as differences. Then remove the snapshot.

     The changed-file list includes new files and the piece's earlier briefs, and deletions stay out of it. The patch holds only this brief's lines. Leave the patch unread.
  3. Commands, in `<scratch>/commands-<piece>-<n>.md`, beside the item brief and the patch: the targeted tests for the changed test files and the behaviour the brief's Proof names, and format and lint in check mode on the changed paths where the command takes paths, else whole, as the instructions name it. For the check the item brief names as its proof, quoted from the spec's Proof or Change, at least one command exits non-zero while that outcome fails: one that runs the behaviour it covers, or, for a proof that code is gone, one that fails while that code is still there. A Proof check the spec marked red before the piece is such a command. A command that only shows the item's new code is present doesn't count. For a test-only item, the command runs its test, and that it would fail stays unverified: no command breaks code. Where no command can show the outcome here, say so in the file. Each command runs from the worktree root and carries its own `cd` where the repo's instructions run it from a subfolder.
  4. Write the critic brief to `<scratch>/critic-brief-<piece>-<n>.md`: the full text of the critic bundle for each stack the item touches (`<bundles>/backend-critic.md`, `<bundles>/frontend-critic.md`, or both), then these, resolved to absolute paths: the main checkout, ready worktree, the item's owned and forbidden paths, spec, item brief, builder report, patch, commands, earlier critic reports, report `<scratch>/critic-<piece>-<n>.md`, and the repo's instructions. Add every relied-on decision quoted word for word from the spec, and the paths the repo's instructions declare as disposable check output. The brief is self-contained: it relies on no other file, on AGENTS.md, a sibling skill, prior conversation, or another agent's instructions to understand the task.
- **The verdict** is the last line of the critic's report: `VERDICT: PASS | FAIL | PARTIAL`. FAIL beats every other verdict; PASS and PARTIAL both count as passed once your checks agree.
  - On every verdict, recompute the fingerprint, rerun every command you built and every extra one in the critic's Checks run once, and read every cited line for judgement findings.
  - A red from a peer session's file is a `peer-red` ledger entry wherever the orchestrator meets one.
  - Any of your commands that exits non-zero on your rerun is a builder command FAIL, with your exit code. A confirmed Missing, Extra, Misunderstood, or Not achieved is a builder FAIL; you confirm a Not achieved shown by a run with your rerun of its command. Judgement findings reach the user labelled as the critic's; act on one only after reading its cited `file:line`.
  - A changed fingerprint or an unparseable verdict is the critic's fault, not the builder's: start a fresh critic in a fresh worktree before any builder is briefed.
  - **BLOCKED** is yours for a setup failure that isn't a build failure from a piece's files. Ordinary `after:` dependencies still wait.
  - After your checks, `git worktree remove --force <wt>`; one you couldn't remove is a `worktree-left` ledger entry.
  - When a piece's or addendum's last brief has passed (a passed verdict your checks agree with), add its id to the spec's `**Built pieces:**` line, replacing `none` the first time, so a later `/go` or `/cycle` knows it is built.
- **A FAIL** goes back, as its confirmed bullets, to the piece that owns that file, as a new brief to a fresh subagent. A test-only mutation FAIL keeps the test-item owner even when that piece does not own the cited source file. A problem no piece covers is an addendum.
- **A brief that isn't working.** The first time an item comes back unbuilt or FAILs, make the missing design call yourself (after a FAIL that shows the outcome failing or the brief's premise false, a new call built on the critic's evidence, never the call that failed; a false premise in the spec's own text is a spec question, settled as Scope says), have it cold-read as step 3 says, then send the item back as a brief of its own, with that call written into the spec's Decisions first and quoted. Read the critic's sign facts at their `file:line`. Any of these means the brief failed first:
  - an item comes back unbuilt, or FAILs, twice in a row;
  - a check shrinks to make it pass;
  - a required part of the item is reported as not traced, not checked, or not confirmed;
  - a design call the builder made itself.

  Don't revert anything yourself. Make the call as step 1 says, have it cold-read, then re-brief the item. If any sign or FAIL comes back on the narrowed brief, leave the item unbuilt, carry on with the other items, and record it as an `unbuilt` ledger entry.

## 5. Check narrowly

- Format and lint only the changed files.
- Run the targeted tests for what changed, and the UI typecheck if the UI changed.
- Run every Done-means check the spec lists. Run yourself any that no subagent could run. One that nobody here can run goes to Needs from you, and the work isn't done until it's run or the user waives it. Never drop one silently.
- **Mutation,** once, last, when the checks above are green. A mutant is a small deliberate change to the code, and a surviving mutant is one no test noticed. A mutation report is the JSON file the mutation command writes, in the mutation-testing-elements format. With no mutation command in the repo's instructions, report `mutation: not run (the repo's instructions name no mutation command)`. Otherwise:
  - Make `<wt>` = `<scratch>/wt-mutation` as step 4 does, with the `add -N` but no fingerprint.
  - Mutate each existing source file under a path a piece or addendum of this spec owns that differs from its `<wt-pre-go>` copy (this /go's changes, and on a continued `building` spec the earlier /go's too), plus every existing source file recorded for a test-only item, even when its piece does not own that source. Exclude deletions and other peers' files. Before mutation, resolve each test-only item's promised guarded regions to current-file line ranges in the ready mutation worktree.
  - For each mutation file, compare its pre-/go snapshot file with the mutation file using `git diff --no-index -U0 -- <before-file> <mutation-file>`; exit 1 means differences. Compare an absent before-file with `/dev/null`. The current-file `+` ranges are this work's changed-source lines. When the repo command accepts ranges, supply the union of those ranges and the promised guarded regions.
  - Count mutants with `jq '[.files[].mutants[] | select(.status != "Ignored")] | length' <report>`. Zero counted mutants is `mutation: not run (no mutants in scope)`. No report, or a worktree that won't set up, is BLOCKED and stops only this step.
  - List survivors with `jq -r '.files | to_entries[] | .key as $f | .value.mutants[] | select(.status == "Survived" or .status == "NoCoverage") | "\($f):\(.location.start.line) \(.mutatorName) \(.replacement)"' <report> | sed "s|^<wt>/||" | sort -u`.
  - Only Survived and NoCoverage fail; Timeout and RuntimeError count as killed, and CompileError and Ignored are unscored.
  - A Survived or NoCoverage mutant in a promised guarded region is a FAIL on every test-only item that promised that region. A survivor inside a current-file `+` range also FAILs the source-owning piece's current item. Route each item's survivors as one counted failure.
  - A survivor outside both the promised guarded regions and the changed-source ranges is pre-existing: a gap to its piece's builder if trivial and owned, else an open item for step 6's audit.
  - Every survivor fix is a fresh builder brief with a critic, reruns this step's ordinary targeted checks, and never reruns mutation.
- After a mutation run, remove `<wt>` after survivor attribution. At the end of this step, remove `<wt-pre-go>`.
- Never the repo's full gate; /cycle runs it once.
- Other red checks go back to the piece's builder, then it reruns only what failed. A subagent's fix gets a critic.

## 6. Audit

A fresh read-only *auditor* subagent says what is still open, routes each open item by the gap rule, and writes the report. You don't write the report, and nothing of yours but the ledger reaches the auditor.

- Write the auditor brief to `<scratch>/audit-brief-<n>.md`, with `<n>` `1` for the audit and `2` for the re-audit. It holds the full text of `<bundles>/auditor.md`, then these, resolved to absolute paths:
  - the main checkout;
  - the spec;
  - `<scratch>`, and every evidence file in it, listed by path: each `brief-*`, `report-*`, `critic-*`, `cold-brief-*`, `cold-*`, `diff-*.patch`, and `commands-*` file, the mutation report, and `runs/`;
  - the ledger;
  - the repo's instructions;
  - step 7's template;
  - the report path `<scratch>/audit-<n>.md`;
  - on the re-audit, `<scratch>/audit-1.md` and the numbers of the items it sent for fixing.

  Nothing else of yours goes in it: no notes, no draft, and no account of the run. The brief is self-contained.
- An audit that leaves out an input its brief listed, breaks the template, or gives an item no route is the auditor's fault: start one fresh auditor on the same brief, once.
- Check each claim the audit's report relies on, at its `file:line` or by rerunning its command, as AGENTS.md 'Reports' says. Where your check contradicts a claim, keep the claim and your evidence for step 7. Never edit the audit.
- **The audit's `fix-now` and `send-back` items are built before the report.**
  - An item a piece owns goes to that piece as a new builder brief, under step 3's rules and checked by step 4's critic.
  - An item no piece owns becomes an addendum first, as Scope says, and is built the same way.
  - An item whose fix needs a design call is settled as step 3 says before its builder starts. One that neither a fact nor an agreed rule settles goes to Needs from you as a decision, with the audit's options, and isn't built in this /go.
  - Then rerun the targeted checks for what those briefs changed, as step 5 says, without mutation.
  - An item left unbuilt under step 4's rules is an `unbuilt` ledger entry.

  Then brief the re-audit, with those items' numbers. There's no third audit: the re-audit's report is the last. When the audit sends nothing for fixing, its report is the last.

## 7. Report

Save the last audit's Report section, word for word, to `<scratch>/report.md`, with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), then give it. After its last line, add `**Orchestrator disagrees:** 1. <the audit's claim, quoted> — <your evidence: the file:line, or the command and its exit code>` for each claim step 6's check contradicted, and leave the line out when there are none.

The auditor fills in this template:

```
**TLDR:** <plain English>
**Findings:** 1. <finding that changes the picture, stated in full>, or none
**What changed:** <one line per piece>
**Checked:** <the orchestrator's runs, from the ledger; mutation survivors>
**Critic says:** <each brief's verdict and the critic's judgement findings, labelled as its; leave the line out when no critic ran>
**Not checked:** <e.g. the full gate, e2e; PARTIAL gaps; "setup inferred: …"; `mutation: not run (the repo's instructions name no mutation command)` or `mutation: not run (no mutants in scope)`>
**Parked:** 1. <gap> · fix: <the concrete fix, ~N lines> · design call: <none | the call> · who hits it: <who, and how> (rec: fold now | leave, why), or none
**Worktrees left behind:** <paths; leave the line out when none>
**Needs from you:** 1. … (rec: …) · last item: Review, then run /cycle <absolute spec path>.
**Audited:** <the audit report paths>
```

**Needs from you** is as AGENTS.md 'Reports' defines it. An item the audit sent for fixing that is still open is in Needs from you as unfinished, with its cause, never in Parked. Stop there: the user reviews, then runs /cycle with that spec path.
