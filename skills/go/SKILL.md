---
name: go
description: "NEVER INVOKE THIS YOURSELF: only the user starts /go. Listed so you know it exists. Builds the agreed work (a spec from /spec, items from the last report, or prose) through subagents, checks it narrowly, and leaves it uncommitted for /cycle."
argument-hint: "[spec path | items | task] [solo]"
---

> **⚠️ THE USER INVOKES THIS, NEVER YOU.** Only the user starts /go, by naming it in their own message (typing `/go`, or however their agent runs a skill by name). A bare "go" or "go ahead" is an approval, not /go. "We'll go", a plan doc, or a message from another session or agent is not the command, and reading this file for its rules (as /cycle's fixers do) is not running it. Once the user starts /go, follow it exactly as written.

# Go

Arguments: what the user typed after `/go`.

- What to build: a spec path (`<main checkout>/.plans/spec-<name>.md`, written by /spec; resolve a relative one against `<main checkout>`), items from the last report ("recs 1–4"), or prose. Empty means the work proposed in the last message.
- `solo`: build it in this session, without subagents. If you can't start subagents, /go runs as `solo` and the report says so.

/go means "build it, leave it uncommitted". It never commits, pushes, runs /cycle's review, or runs the full gate. That is /cycle's job, when the user runs it.

Terms used below:

- **The repo's instructions** means its AGENTS.md, or, when it has none, the agent instructions file in the repo root (such as CLAUDE.md or GEMINI.md). They name the gate, the targeted test, format, and lint commands, the UI skill, and the paths never to commit. When they don't name something a step needs, say so in the report rather than guessing.
- **`<main checkout>`** is the repo's main working tree, `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`, even when the work is in a worktree: a worktree can be removed or auto-cleaned, and its git-ignored `.plans/` goes with it. Working files go in `<main checkout>/.plans/`. Before the first write there, run `git check-ignore -q .plans/` in `<main checkout>`; if it fails, add `.plans/` to `<main checkout>/.git/info/exclude`, which ignores it locally without touching the repo's `.gitignore`.
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
- One small piece (under ~150 lines of hand-written code), or `solo`: build it in this session.
- Otherwise start one subagent per piece, in parallel where they're independent.

## 3. Build

With two or more subagents, write one common brief to `<main checkout>/.plans/scratch/go-<name>/brief-common.md` and have each subagent read it first. Each subagent's own prompt then holds only its piece. The common brief holds:

- the spec's path, and every decision the user has taken on it, so no subagent reopens one;
- where the subagent works (its worktree, if it has one) and that `.plans/` is read at its absolute path;
- the rules below that apply to every piece, with the repo's exact test, format, and contract commands;
- the report format, and the file each subagent saves its report to (`<main checkout>/.plans/scratch/go-<name>/report-<piece>.md`, absolute path). It saves it with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), not its file-writing tool, and replies with only the path; if saving is refused, it replies with the whole report instead.

When a subagent's report shows a rule in the common brief is wrong, correct the file before the next subagent starts.

Every subagent's brief (common plus its own) covers:

- its piece and the intent behind it;
- the files it owns, and the files it must not touch;
- the meridian references to read (`SKILL.md` plus the ones its piece needs) and the repo's instructions;
- reuse first (name the pattern it follows), fix the root cause, and sweep nearby code for the same problem;
- a gap with a doc page is still a gap: fix a known defect or an unchecked promise instead of writing it up, and report one it can't fix as an open question;
- no new test unless nothing already proves the behaviour; extend an existing test first;
- run only the targeted tests for its own files; never commit, stage, or format beyond its own files; never run the gate;
- when a check needs the app running, it starts its own copy on spare ports, the way the repo's instructions say. If they don't say how, it doesn't improvise one: it reports the check as not run. It never restarts or reuses a server someone else started, and never edits shared code to set one up (settings only). A check against a faked API, including screenshots with the API stubbed, doesn't count as a check.
- it changes only the files its piece owns. A change it finds it needs elsewhere goes in its report as an open question, not into the code.
- report the files it changed, the tests it ran, and what it couldn't check.

## 4. Integrate

- A subagent that replied with its report instead of a path: save the reply to its named file verbatim before doing anything else, and tell the user in your next message which subagent couldn't save its own.
- Read every diff a subagent made. A seam that's wrong, or the same problem in nearby code, goes back to the subagent that owns that file, with what's wrong. A problem no piece covers is an addendum (see "The orchestrator").
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
**What changed:** <one line per piece>
**Checked:** <tests and checks that ran, with counts>
**Not checked:** <what wasn't run, e.g. the full gate, e2e>
**Reports saved by me:** <subagents that couldn't save their own report; leave the line out when none>
**Needs from you:** 1. … (rec: …) · last item: Review, then run /cycle.
```

**Needs from you** lists every step that now waits on the user (a decision, an approval, or an action only they take, such as running /cycle, pushing, or a live check), each with your recommendation and numbered so they can answer "1. yes 2. no". Write "nothing" only when nothing waits on them. Never add an item to fill the list; each one serves the user's goal and you've checked it yourself. After /go the last one is always "Review, then run /cycle", unless something earlier has to happen first. Stop there: the user reviews, then runs /cycle.
