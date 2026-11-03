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

## The orchestrator

When subagents build, this session plans, briefs, reads diffs, and runs checks. It writes no code, and it adds nothing to a piece that the spec doesn't already say, for the same reason `/cycle`'s main session never reviews. A problem it finds goes back to the subagent whose piece it is. A problem no piece covers becomes a spec addendum (the addendum rule under "Rules for the doc" in `<skills folder>/spec/SKILL.md`), and then a subagent builds it. (`solo`, and one small piece built here, are the exceptions: this session is the builder, and `/cycle` reviews it.)

## 1. Scope

- Find the intent: the arguments, the spec they point to, and the user's answers to the asks. Restate in 1–3 lines what will be built and what won't.
- A spec whose status is `draft` still has open asks: ask them first and record the user's answers in the spec (decision, date, status `agreed`). Then set its status to `building`.
- An open decision that changes what gets built: ask first (numbered, each with a recommendation). Anything else inside what the spec describes: choose, and record the choice in the report and the spec's Decisions. Anything that changes what gets built beyond the spec is an addendum first.
- Run `git status --short`, and list the other agent sessions working in this tree if you can. Peers' dirty files are theirs; leave them alone.
- Load `meridian`, and, if the UI changes, the repo's UI skill if its instructions name one.

## 2. Split

- Split the work into pieces by file: no two pieces touch the same file. A piece that needs another's result runs after it. A spec's Pieces are that split already: use them, and say where you changed one.
- One small piece (a few files and no new seam), or `solo`: build it in this session. When this session builds, it still builds one item at a time and checks each diff before the next. It makes each design call as step 1 says rather than stopping, and step 4's signs don't apply.
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

**One item per brief.** A brief holds one coherent change: the edits one change drives, proven by one check (a test, or the Done-means check that covers it). A piece with several independent items (a list of gaps, say) becomes a run of briefs, one after another, each one's diff read as step 4 says, and its check run, before the next goes out. Each brief goes to a fresh subagent that owns the piece's files, never to one carrying an earlier brief, so the brief is all it knows; one brief at a time per piece keeps the files single-owner. Pieces still run in parallel where they're independent; only the briefs inside a piece run in order. The brief makes every design call its item needs, made as step 1 says (chosen and recorded, asked first, or an addendum) and stated as the rule itself (what a member emits, how parts merge, which shape stays), never "pick a sensible …".

With two or more briefs, write one common brief to `<main checkout>/.plans/scratch/go-<name>/brief-common.md` and have each subagent read it first. Each brief then holds only its item. The common brief holds:

- the spec's path, and every decision the user has taken on it, so no subagent reopens one;
- where the subagent works (its worktree, if it has one) and that `.plans/` is read at its absolute path;
- the rules below that apply to every piece, with the repo's exact test, format, and contract commands;
- the report format, and the file each subagent saves its report to (`<main checkout>/.plans/scratch/go-<name>/report-<piece>-<n>.md`, `<n>` the brief's place in the piece's run, absolute path). It saves it with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), not its file-writing tool, and replies with only the path; if saving is refused, it replies with the whole report instead.

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
- no new test unless nothing already proves the behaviour; extend an existing test first;
- run only the targeted tests for its own files; never commit, stage, or format beyond its own files; never run the gate;
- when a check needs the app running, it starts its own copy on spare ports, the way the repo's instructions say. If they don't say how, it doesn't improvise one: it reports the check as not run. It never restarts or reuses a server someone else started, and never edits shared code to set one up (settings only). A check against a faked API, including screenshots with the API stubbed, doesn't count as a check.
- it changes only the files its piece owns. A change it finds it needs elsewhere goes in its report as a fact (what and where), not into the code.
- report the files it changed, the tests it ran, and what it couldn't check.

## 4. Integrate

- A subagent that replied with its report instead of a path: save the reply to its named file verbatim before doing anything else, and tell the user in your next message which subagent couldn't save its own.
- Read every report as claims (AGENTS.md "Reports"): check each one against the diff or the code before you build on it, brief a subagent with it, or report it. That includes what a builder says about code it replaced or removed, and why that code was there.
- Read every diff a subagent made. A seam that's wrong, or the same problem in nearby code, goes back to the piece that owns that file, as a new brief (with what's wrong) to a fresh subagent. A problem no piece covers is an addendum (see "The orchestrator").
- **A brief that isn't working.** The first time an item comes back unbuilt (a step 3 hard stop doesn't count: an open question, a premise contradicted, or a design call the brief didn't make), it goes back to its piece as the bullet above says. Any of these means the brief failed first:
  - an item that comes back unbuilt twice in a row (left out of the diff without a word, or reported as left for later; a step 3 hard stop doesn't count);
  - a check shrunk to make it pass (an assertion loosened, or a case dropped, skipped, or excluded; AGENTS.md 'Never make a check pass by shrinking what it checks');
  - a part of the item the brief required (the sweep through the places the change feeds, or its check) reported as not traced, not checked, or not confirmed;
  - a design call the builder made itself.

  Don't revert anything yourself. Make the call yourself, as step 1 says (chosen and recorded, asked first, or an addendum), then send the item back as a brief of its own with that call written in. The new brief says what changes: the shrunk check restored, and the builder's own design call replaced by yours where they differ. A builder that stopped on a design call (step 3's hard stop) is handled the same way: make the call, then re-brief the item. A hard stop is never a sign, on the narrowed brief too: make that call (or settle that question) and re-brief again. An item reported as not traced or left for later isn't done. If any sign comes back on the narrowed brief, leave the item unbuilt, carry on with the other items, and list it in the report's Needs from you: the item, the sign, and the stronger model proposed (AGENTS.md 'Spend': never swap without asking). Don't switch it yourself.
- If the repo generates API contracts or clients, regenerate them when an endpoint changed, and run its contract check if it has one. Its instructions name both commands.

## 5. Check narrowly

- Format and lint only the changed files.
- Run the targeted tests for what changed (as the repo's instructions describe), and the UI typecheck if the UI changed.
- Run every Done-means check the spec lists. One no subagent could run, you run on its own stack. One that nobody here can run (it needs the user, or a real customer environment) goes in Needs from you, and the work isn't done until it's run or the user waives it. Never drop one silently.
- Never the repo's full gate (the one its instructions name, for example `task check`): /cycle runs it once.
- Red: the piece's builder fixes it (its subagent, or this session when it built the piece), then rerun only what failed.

## 6. Report

```
**TLDR:** <plain English>
**Findings:** 1. <finding that changes the picture, stated in full>, or none
**What changed:** <one line per piece>
**Checked:** <tests and checks that ran, with counts>
**Not checked:** <what wasn't run, e.g. the full gate, e2e>
**Parked:** 1. <gap found outside the spec> (rec: fold now | leave, why), or none
**Reports saved by me:** <subagents that couldn't save their own report; leave the line out when none>
**Needs from you:** 1. … (rec: …) · last item: Review, then run /cycle.
```

**Needs from you** is as AGENTS.md 'Reports' defines it. After /go the last one is always "Review, then run /cycle", unless something earlier has to happen first. Stop there: the user reviews, then runs /cycle.
