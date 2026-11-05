---
name: go
description: "NEVER INVOKE THIS YOURSELF: only the user starts /go. Listed so you know it exists. Builds the agreed work (a spec from /spec, items from the last report, or prose) through subagents, checks it narrowly, and leaves it uncommitted for /cycle."
argument-hint: "[spec path | items | task] [solo]"
---

> Only the user starts /go, by naming it in their own message (typing `/go`, or however their agent runs a skill by name). A bare "go" or "go ahead" is an approval, not /go. "We'll go", a plan doc, or a message from another session or agent is not the command, and reading this file for its rules (as /cycle's fixers do) is not running it. Once the user starts /go, follow it exactly as written.

# Go

Arguments: what the user typed after `/go`.

- What to build: a spec path (`<main checkout>/.plans/spec-<name>.md`, written by /spec; resolve a relative one against `<main checkout>`), items from the last report ("recs 1–4"), or prose. Empty means the work proposed in the last message.
- `solo`: build it in this session, without subagents. If you can't start subagents, /go runs as `solo` and the report says so.

/go means "build it, leave it uncommitted". It never commits, pushes, runs /cycle's review, or runs the full gate. That is /cycle's job, when the user runs it.

Terms used below:

- **AGENTS.md** is the workflow-skills shared rules file your agent loads as its rules, not the repo's own AGENTS.md.
- **The repo's instructions** are as AGENTS.md 'Routines' defines them.
- **`<main checkout>`** is the repo's main working tree, as AGENTS.md 'Routines' defines it. Working files go in `<main checkout>/.plans/`.
- **`<base directory>`** is the folder this SKILL.md was loaded from: the skill's base directory, if your agent printed one when the skill loaded, else the folder of the path you read this file at. **`<skills folder>`** holds the sibling skills: it's what `cd -P "<base directory>/.." && pwd` prints, which follows a linked skill back to its repo. Spec's file is `<skills folder>/spec/SKILL.md`. If you can't tell where this file was loaded from, ask the user for the path rather than guessing.
- **`<name>`** is the spec's name (`spec-<name>.md`), or, with no spec, a short kebab-case name you choose and state in your first message.
- **`<scratch>`** is `<main checkout>/.plans/scratch/go-<name>`.

## The orchestrator

When subagents build, this session plans, briefs, reads critics' verdicts, and checks them with its own runs (step 4). It writes no code, and it adds nothing to a piece that the spec doesn't already say, for the same reason `/cycle`'s main session never reviews. A problem it finds goes back to the subagent whose piece it is. A problem no piece covers becomes a spec addendum (the addendum rule under "Rules for the doc" in `<skills folder>/spec/SKILL.md`), and then a subagent builds it. (`solo`, and one small piece built here, are the exceptions: this session is the builder, and `/cycle` reviews it.)

## 1. Scope

- Find the intent: the arguments, the spec they point to, and the user's answers to the asks. Restate in 1–3 lines what will be built and what won't.
- A spec whose status is `draft` still has open asks: ask them first and record the user's answers in the spec (decision, date, status `agreed`). Then set its status to `building`.
- An open decision that changes what gets built: ask first (numbered, each with a recommendation). Anything else inside what the spec describes: choose, and record the choice in the report and the spec's Decisions. Anything that changes what gets built beyond the spec is an addendum first.
- Run `git status --short`, and list the other agent sessions working in this tree if you can. Peers' dirty files are theirs; leave them alone.
- Snapshot the whole uncommitted tree at `<wt-pre-go>` = `<scratch>/wt-pre-go`, with no restore, install, build, or checks:
  - `git worktree add --detach <wt-pre-go> HEAD`
  - `git diff HEAD --binary | git -C <wt-pre-go> apply --allow-empty`
  - `git ls-files -z --others -- . ':(exclude).plans/' <output exclusions> | tar --null -T - -cf - | tar -xf - -C <wt-pre-go>`
  - Mark its non-ignored untracked files with `git -C <wt-pre-go> ls-files --others --exclude-standard -z | xargs -0 git -C <wt-pre-go> add -N --`.
  - Save `<scratch>/pre-go.patch` with `git -C <wt-pre-go> diff HEAD --binary -- <every piece's owned paths> > <scratch>/pre-go.patch`.

  Keep the snapshot until step 5's survivor attribution is done, then remove it.
- Load `meridian`, and, if the UI changes, the repo's UI skill if its instructions name one.

## 2. Split

- Split the work into pieces by file: no two pieces touch the same file. A piece that needs another's result runs after it. A spec's Pieces are that split already: use them, and say where you changed one.
- A shared change applied in three or more places gets one piece headed `Tracer bullet:` that builds the shared change end to end through one consumer. A tracer bullet is one shared change built end to end through one consumer first. Only pieces applying that shared change elsewhere name the tracer in `after:` and wait for its targeted tests, format, and lint, plus the critic and orchestrator checks when subagents build it. Independent pieces, independent tracer bullets included, do not wait.
- One small piece (a few files and no new seam), or `solo`: build it in this session, with no critic. It still builds one item at a time and checks each diff before the next, makes each design call as step 1 says rather than stopping, and step 4's signs don't apply. If the repo generates API contracts or clients, it regenerates them when an endpoint changed and runs the repo instructions' contract check. When this session builds a tracer, it runs the tracer's targeted tests, format, and lint itself before dependants start, with no critic.
- Otherwise subagents build the pieces, in parallel where they're independent: one fresh subagent per brief (step 3).

## 3. Build

Hard block: no builder starts on a question. Before you start any builder, its piece, every addendum it builds, and every decision either relies on must have no open question. That means none of these:

- an ask without a recorded answer;
- a "hangs on", "waits on", or "if ask N is yes/no" that isn't settled;
- an "or", "TBD", "check whether", or "if the hosts show…" that leaves what gets built undecided;
- a premise about framework or host behaviour that nobody has checked against the real thing;
- a Decision or Piece that breaks a meridian Law (it goes back to the spec as an addendum, not to a builder).

If there is one, settle it before the builder starts:

1. Check the facts yourself, or with a read-only subagent that reports facts only.
2. Ask the user, with those facts, only what neither a fact nor an agreed rule settles. Settle the rest, and record what settled each.
3. Write their answer into the spec.

A builder is never where a question gets answered.

**One item per brief.** A brief holds one coherent change: the edits one change drives, proven by one check (a test, or the Done-means check that covers it). A piece with several independent items (a list of gaps, say) becomes a run of briefs, one after another, each passing step 4 before the next goes out. Each brief goes to a fresh subagent that owns the piece's files, never to one carrying an earlier brief, so the brief is all it knows; one brief at a time per piece keeps the files single-owner. Pieces still run in parallel where they're independent; only the briefs inside a piece run in order. The brief makes every design call its item needs, made as step 1 says (chosen and recorded, asked first, or an addendum) and stated as the rule itself (what a member emits, how parts merge, which shape stays), never "pick a sensible …". A brief whose item changes only tests names the guarded source files and the precise behavior it promises to guard, identified by symbol or source region. Step 5 resolves those regions to current line ranges before mutation.

Write each brief to `<scratch>/brief-<piece>-<n>.md` (`<n>` its place in the piece's run). With two or more, also write `<scratch>/brief-common.md` and have each subagent read it first; each brief then holds only its item. The common brief holds:

- the spec's path, and every decision the user has taken on it, so no subagent reopens one;
- where the subagent works (its worktree, if it has one) and that `.plans/` is read at its absolute path;
- the rules below that apply to every piece, with the repo's exact test, format, and contract commands;
- the report format, and its report file, `<scratch>/report-<piece>-<n>.md` (absolute path). It saves it with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), not its file-writing tool, and replies with only the path; if saving is refused, it replies with the whole report instead.

When a subagent's report shows a rule in the common brief is wrong, correct the file before the next brief goes out, and tell any subagent still building that it changed.

Every subagent's brief (common plus its own) covers:

- **its hard stop.** Before editing anything, it reads its piece, the spec's open asks, and the decisions its piece relies on.
  - If it finds any open question (an unanswered ask, an unsettled "hangs on" or "waits on", an undecided "or", or a premise it can't confirm), it builds nothing and reports.
  - If, while building, the code or a host contradicts the piece's premise, it stops at once. It leaves its edits in place and says which files it touched.
  - If, while building, it meets a design call the brief didn't make, it stops that item where it is, leaves its edits in place, and says which files it touched; the item counts as unbuilt. It reports the call and what the code at that point admits (each shape the existing code already uses or allows, with its `file:line`), as facts, without picking or ranking one.
  - In every case, its report gives the facts only: what it read or ran, the `file:line`s, and what the host or code actually does. It gives no recommendation, no confidence, and no proposed fix; a list of what the code admits is a fact, not a proposed fix. Judgement is the orchestrator's, never a builder's.
- its piece and the intent behind it;
- the files it owns, and the files it must not touch;
- the meridian references to read (`SKILL.md` plus the ones its piece needs) and the repo's instructions;
- reuse first (name the pattern it follows), fix the root cause, sweep nearby code for the same problem, and never make a check pass by shrinking what it checks;
- a gap with a doc page is still a gap: fix a known defect or an unchecked promise instead of writing it up, and report one it can't fix, as facts, with no recommendation;
- no new test unless nothing already proves the behaviour; extend an existing test first. Write each test so it would fail if what it guards broke; step 5's mutation run proves it;
- run only the targeted tests for its own files; never commit, stage, or format beyond its own files; never run the gate;
- when a check needs the app running, it starts its own copy on spare ports, the way the repo's instructions say. If they don't say how, it doesn't improvise one: it reports the check as not run. It never restarts or reuses a server someone else started, and never edits shared code to set one up (settings only). A check against a faked API, including screenshots with the API stubbed, doesn't count as a check.
- it changes only the files its piece owns. A change it finds it needs elsewhere goes in its report as a fact (what and where), not into the code.
- report the files it changed, the tests it ran, and what it couldn't check.

## 4. Integrate

A fresh *critic* subagent checks each subagent builder's brief before the piece's next brief and before step 5. Its prompt is the absolute path of `<base directory>/references/critic.md`. Never tell it what to ignore. You check its verdict with your own runs instead of reading every diff. Run git commands from the root of the tree being built (`git rev-parse --show-toplevel`), and keep working files under `<main checkout>/.plans/`.

- A builder or critic that replied with its report instead of a path: save the reply to its file verbatim, and tell the user which one.
- Reports are claims (AGENTS.md "Reports"). The critic checks the builder's; you check the critic's, below.
- **Contracts.** However the piece was built, if the repo generates API contracts or clients, regenerate them when an endpoint changed and run its contract check, as its instructions name.
- **After each subagent builder's brief:**
  1. Make the ready worktree `<wt>` at `<scratch>/wt-<piece>-<n>`, with no trailing slash, before the critic starts:
     - `git worktree add --detach <wt> HEAD`
     - `git diff HEAD --binary | git -C <wt> apply --allow-empty`
     - `git ls-files -z --others -- . ':(exclude).plans/' <output exclusions> | tar --null -T - -cf - | tar -xf - -C <wt>`

     Each output exclusion is a quoted Git pathspec, `':(exclude)<path>'`, for a disposable check-output path declared in the repo's instructions. This copies ignored inputs too; only `.plans/` and those declared outputs stay out. With no declared outputs there are no output exclusions.
     - the restore, install, and build the repo's instructions name (none named: the lockfiles', and "setup inferred: …" under Not checked)
     - mark non-ignored untracked files with intent to add: `git -C <wt> ls-files --others --exclude-standard -z | xargs -0 git -C <wt> add -N --`
     - the fingerprint (the hash that catches edits made during the critic's run): `(cd <wt> && git ls-files -z --cached --others -- . ':(exclude).plans/' <output exclusions> | xargs -0 shasum) | shasum > <wt>.fp`

     Setup precedes the critic. A build failure is a command FAIL with its exit code, routed to the piece that owns the failing file. Any other setup failure is BLOCKED, your verdict, and no critic starts.
  2. Changed files and the patch, both from the ready worktree after `add -N`:
     - `git -C <wt> diff --name-only --diff-filter=d HEAD -- <owned paths>`
     - `git -C <wt> diff HEAD --binary -- <owned paths> > <scratch>/diff-<piece>-<n>.patch`

     They include new files, binary content, and the piece's earlier briefs. Deletions stay out of the changed-file list. The repo's instructions say where tests live, splitting test files from source files. Leave the patch unread.
  3. Commands, in `<scratch>/commands-<piece>-<n>.md`, beside the item brief at `<scratch>/brief-<piece>-<n>.md` and the patch: the targeted tests for the changed test files and the behaviour the brief's Proof names, and format and lint in check mode (on the changed paths where the command takes paths, else whole, as the instructions name it). Each command runs from the worktree root and carries its own `cd` where the repo's instructions run it from a subfolder.
  4. The fresh critic, given absolute paths to: AGENTS.md, meridian `SKILL.md`, the repo's instructions, the item brief, the builder's report, the patch, the spec (or the items it came from), `brief-common.md` if any, the piece's earlier critic reports, the ready `<wt>`, the commands, its report `<scratch>/critic-<piece>-<n>.md`, and its log folder `<scratch>/critic-<piece>-<n>-logs/`.
- **The verdict** is the critic's last line: `VERDICT: PASS | FAIL | PARTIAL`. FAIL beats every other verdict; PASS and PARTIAL both count as passed once your checks agree. Send all output to files under `<scratch>`, and read only exit codes, the fingerprint, and the lines a finding cites.
  - **On every verdict:** recompute the fingerprint, then rerun every command you built and every extra one in the critic's Checks run once, comparing exit codes. Check that every command you built appears in Checks run, and read every cited line for judgement findings (Missing, Misunderstood, Extra, and sign facts). On PARTIAL, check each named gap against the repo's instructions.
  - A red from a peer session's file goes to Needs from you wherever the orchestrator meets one, including during setup and command reruns.
  - A confirmed different exit code is a builder command FAIL with your own exit code. A confirmed Missing, Extra, or Misunderstood is a builder FAIL. Judgement findings reach the user labelled as the critic's; act on one only after reading its cited `file:line`.
  - A changed fingerprint, an unparseable verdict, or one of your commands missing from Checks run is the critic's fault, not the builder's: start a fresh critic in a fresh worktree before any builder is briefed. It doesn't count toward the item's FAILs.
  - **BLOCKED** is yours for a setup failure that isn't a build failure from a piece's files, and goes to Needs from you. Ordinary `after:` dependencies still wait.
  - After your checks, `git worktree remove --force <wt>`; report any you couldn't remove.
- **A FAIL** goes back, as its confirmed bullets, to the piece that owns that file, as a new brief (with what's wrong) to a fresh subagent; a test-only mutation FAIL keeps step 5's test-item owner even when that piece does not own the cited source file. A problem no piece covers is an addendum. Any critic or orchestrator FAIL on the builder's work counts, including a setup build failure or a rerun mismatch.
- **A brief that isn't working.** The first time an item comes back unbuilt or FAILs (a step 3 hard stop doesn't count: an open question, a premise contradicted, or a design call the brief didn't make), it goes back to its piece as the bullet above says. Read the critic's sign facts at their `file:line`. Any of these means the brief failed first:
  - an item that comes back unbuilt, or FAILs, twice in a row (left out of the diff without a word, or reported as left for later; a step 3 hard stop doesn't count);
  - a check shrunk to make it pass (an assertion loosened, or a case dropped, skipped, or excluded; AGENTS.md 'Never make a check pass by shrinking what it checks');
  - a part of the item the brief required (the sweep through the places the change feeds, or its check) reported as not traced, not checked, or not confirmed;
  - a design call the builder made itself.

  Don't revert anything yourself. Make the call yourself, as step 1 says (chosen and recorded, asked first, or an addendum), then send the item back as a brief of its own with that call written in. The new brief says what changes: the shrunk check restored, and the builder's own design call replaced by yours where they differ. A builder that stopped on a design call (step 3's hard stop) is handled the same way: make the call, then re-brief the item. A hard stop is never a sign, on the narrowed brief too: make that call (or settle that question) and re-brief again. An item reported as not traced or left for later isn't done. If any sign or FAIL comes back on the narrowed brief, leave the item unbuilt, carry on with the other items, and list it in the report's Needs from you: the item, the sign, and the stronger model proposed (AGENTS.md 'Spend': never swap without asking). Don't switch it yourself.

## 5. Check narrowly

- Format and lint only the changed files.
- Run the targeted tests for what changed (as the repo's instructions describe), and the UI typecheck if the UI changed.
- Run every Done-means check the spec lists. One no subagent could run, you run on its own stack. One that nobody here can run (it needs the user, or a real customer environment) goes in Needs from you, and the work isn't done until it's run or the user waives it. Never drop one silently.
- **Mutation,** once, last, when the checks above are green. A mutant is a small deliberate change to the code, and a surviving mutant is one no test noticed. A mutation report is the JSON file the mutation command writes, in the mutation-testing-elements format (the shared JSON format for mutation results). With no mutation command in the repo's instructions, report `mutation: not run (the repo's instructions name no mutation command)`. Otherwise:
  - Make `<wt>` = `<scratch>/wt-mutation` as step 4 does, with the `add -N` but no fingerprint.
  - Mutate each owned source file this /go changed that exists, plus every existing source file a test-only brief named, even when its piece does not own that source. Exclude deletions and other peers' files. Before mutation, resolve every test-only brief's promised guarded regions to current-file line ranges in the ready mutation worktree; include them even when the source is unchanged. There is no baseline mutation run.
  - For each mutation file, compare its pre-/go snapshot file with the mutation file using `git diff --no-index -U0 -- <before-file> <mutation-file>` (exit 1 means differences); compare an absent before-file with `/dev/null`. The current-file `+` ranges are this work's changed-source lines. When the repo command accepts ranges, supply the union of those changed-source ranges and the promised guarded ranges.
  - Count: `jq '[.files[].mutants[] | select(.status != "Ignored")] | length' <report>`. Zero counted mutants is `mutation: not run (no mutants in scope)`. No report, or a worktree that won't set up, is BLOCKED and stops only this step: to Needs from you, and the pieces stand.
  - Survivors: `jq -r '.files | to_entries[] | .key as $f | .value.mutants[] | select(.status == "Survived" or .status == "NoCoverage") | "\($f):\(.location.start.line) \(.mutatorName) \(.replacement)"' <report> | sed "s|^<wt>/||" | sort -u`.
  - Only Survived and NoCoverage fail; Timeout and RuntimeError count as killed, and CompileError and Ignored are unscored.
  - A Survived or NoCoverage mutant in a promised guarded region is a FAIL on every test-only item that promised that region, routed to each test item's owner even when its piece does not own the source file. Changed-source attribution is additive: a survivor inside a current-file `+` range also FAILs the source-owning piece's current item. Combine all of each item's survivor bullets into one counted failure from this mutation result, even for overlapping regions or several mutants; route and cap it as step 4 says. Each fresh builder brief carries the relevant survivors' `file:line`, mutator, and replacement.
  - A survivor outside both the promised guarded regions and the changed-source ranges is pre-existing: a gap (AGENTS.md "Gaps get fixed"), to its piece's builder if trivial and owned, else Parked.
  - Every survivor fix gets a critic when a subagent builds it (step 4), reruns this step's ordinary targeted checks, and never reruns mutation. Built in this session, you fix survivors yourself.
- After a mutation run, remove `<wt>` after survivor attribution. At the end of this step, remove `<wt-pre-go>`.
- Never the repo's full gate (the one its instructions name, for example `task check`): /cycle runs it once.
- Other red checks: the piece's builder fixes them (its subagent, or this session when it built the piece), then rerun only what failed. A subagent's fix gets a critic (step 4).

## 6. Report

```
**TLDR:** <plain English>
**Findings:** 1. <finding that changes the picture, stated in full>, or none
**What changed:** <one line per piece>
**Checked:** <your own reruns and checks, with counts; mutation's exit code, mutant count, and survivors>
**Critic says:** <each brief's verdict and the critic's judgement findings, labelled as its; leave the line out when no critic ran>
**Not checked:** <e.g. the full gate, e2e; PARTIAL gaps; "setup inferred: …"; `mutation: not run (the repo's instructions name no mutation command)` or `mutation: not run (no mutants in scope)`; "no critic: built in session">
**Parked:** 1. <gap found outside the spec> (rec: fold now | leave, why), or none
**Worktrees left behind:** <paths; leave the line out when none>
**Reports saved by me:** <subagents that couldn't save their own report; leave the line out when none>
**Needs from you:** 1. … (rec: …) · last item: Review, then run /cycle.
```

**Needs from you** is as AGENTS.md 'Reports' defines it. After /go the last one is always "Review, then run /cycle", unless something earlier has to happen first. Stop there: the user reviews, then runs /cycle.
