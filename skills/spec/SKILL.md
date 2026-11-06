---
name: spec
description: Turn the agreed work into the active spec at <main checkout>/.plans/spec.md that /go builds from and /cycle reviews against. Use when the user runs /spec or asks for a spec of the work. Takes no arguments and writes no code.
---

# Spec

`/spec` takes no arguments. If the user supplies any argument, stop before gathering or writing and state that `/spec` takes no arguments.

A spec is the one place the agreed work lives: `/go` builds from it without re-asking, and `/cycle` reviews the diff against it. `/spec` writes that document and nothing else. It never edits code, runs builds or the gate, or commits.

The active spec is `<main checkout>/.plans/spec.md`. Its premise report is `<main checkout>/.plans/scratch/spec/premise.md`, and its cold-read report is `<main checkout>/.plans/scratch/spec/cold-read.md`.

AGENTS.md is the workflow-skills shared rules file your agent loads as its rules, not the repo's own AGENTS.md.

Working files go in `<main checkout>/.plans/`, as AGENTS.md 'Routines' defines it.

## 1. Manage the active spec

Read `<main checkout>/.plans/spec.md` before gathering. If it does not exist, this run creates it.

For an existing file, parse:

- the title from the first `# Spec: <title>` heading;
- the status from the `**Status:**` line, which must be `draft`, `agreed`, `building`, or `built (<hash>)`;
- the previous HEAD from the `**Written:** … against <repo>@<sha>` line.

Then apply the status rule:

- `draft` or `agreed`: update the spec in place.
- `building`: ask the user to continue it or replace it. Continuing updates that same spec in place and preserves `building`. Replacing overwrites it and sets `Supersedes: <previous title> (<previous HEAD>)`.
- `built (<hash>)`: ask the user only whether to replace it. Replacing overwrites it and sets `Supersedes: <previous title> (<previous HEAD>)`.
- An unreadable file, an unrecognized status, a missing or unreadable title, or a missing or unreadable HEAD stops the routine. Ask the user to repair the file or replace it.

## 2. Gather

- Find the intent in this conversation, the user's answers, and any document, backlog, or waypoint the work names.
- Load `meridian` and read the references the work touches.

## 3. Check the premise against HEAD

When you can start subagents, a fresh fact-gatherer does the reading. Before writing its brief, resolve `<main checkout>`, the report path, the source paths, the repo's instructions, and every Meridian file to absolute paths. The brief must contain all of these and every rule the fact-gatherer relies on:

- **Main checkout:** the resolved absolute main working tree.
- **Scope:** read the ask and the source files the work touches; never edit code, run builds, run the gate, or commit.
- **Source paths:** the exact absolute files to read.
- **Doctrine:** the absolute paths of Meridian's `SKILL.md`, the references the work touches, and the repo's instructions.
- **Rules:** report facts with `file:line` and the short SHA; facts come from files, not memory; for any code the work skips, replaces, or changes, record everything that code does today; trace any feature, gate, or tool the work relies on from input to output; report facts only, with no recommendation, option, confidence, or ask.
- **Report path:** the resolved absolute path to `<main checkout>/.plans/scratch/spec/premise.md`.
- **Save protocol:** save the report with a shell heredoc, `cat > <path> <<'EOF'` … `EOF`, not a file-writing tool; if saving is refused, reply with the whole report.
- **Reply protocol:** reply with only the report path.

The brief may name source paths, but it may not rely on an earlier artifact, a sibling skill, prior conversation, or another agent's instructions to understand the task. Check the fact-gatherer's claims yourself against the code, then write the spec; the decisions stay yours.

Without subagents, do the reading yourself and say so in the report.

The premise check must:

- Read the code the work touches. Facts come from files, not memory: cite `file:line`, and record the short SHA the spec was written against.
- When the work skips, replaces, or changes existing code, write down everything that code does today, not only the part this work is about.
- Say what the ask assumed and what HEAD shows. A wrong premise changes the spec before anything else does.
- Check end to end whatever the work relies on: run it, or trace it from input to output, and record what it actually does.
- For each change, name what it reuses: the existing component, flow, pattern, or library. Hand-rolling needs a reason in the spec.
- Fix the root cause, not a symptom. A gap goes in as work, never as a note that it exists.

## 4. Write the spec

Write the active spec at `<main checkout>/.plans/spec.md`. Use this shape. Leave out a section that would be empty, except Open asks and Out of scope, which say "none".

- `<session name>` is this session's own name, if you can find it; otherwise leave the Session field out.
- `<name>` in a decision is the user, by their real name: from the conversation, else `git config user.name`.
- `<previous title> (<previous HEAD>)` is the value derived in step 1 when this run replaces an existing spec; otherwise `Supersedes:` is `none`.

```markdown
# Spec: <title>

**Status:** draft | agreed | building | built (<hash>) · **Written:** <YYYY-MM-DD> against <repo>@<sha> · **Session:** <session name>
**Source:** <docs or conversation it came from> · **Depends on:** <other specs, or none> · **Supersedes:** <previous title> (<previous HEAD>), or none

## Intent
3–5 plain-English sentences: what is true for the user once this ships. No history of how it was found. /cycle reviews against this.

## Premise check
What the ask assumed, what HEAD shows, and any correction.

## Decisions
1. **<decision>.** <what and why>. Alternative: <option> (cost: <cost>). <Agreed by <name>, YYYY-MM-DD | Chosen by the agent when <name> handed it back>.

## Open asks
1. <question> (rec: <answer>; settled by <what would settle it>)

## Pieces
### P1 <name> · owns: <files> · after: <piece, or none>
- **At HEAD:** <file:line, what it does now>
- **Reuse:** <component or pattern it follows; the maintained tool searched for, if any>
- **Change:** <what changes>
- **Proof:** <test to extend, or new test; mark one that is red today>

## Invariants and docs
The INVARIANTS rule, doc page, or changelog line, written out in full.

## Done means
The targeted tests and checks with their exact commands. What stays uncommitted for /cycle. What only the user can do (a deploy, a live check).

## Out of scope
- <thing>: <why>

## Parked
- <found in passing>: <why it isn't this work> (rec: fold in | leave, why)

## Addenda
### A1 <name> · <YYYY-MM-DD> · owns: <files> · after: <piece, or none>
- **Why:** <what came up, and in which step>
- **At HEAD:** <file:line, everything it does now>
- **Change:** <what changes>
- **Proof:** <test to extend, or new test>
<Agreed by <name>, YYYY-MM-DD | No decision in it>
```

Rules for the doc:

- No two pieces own the same file. That is `/go`'s split. When one file has to be shared, name it and say which piece edits it last.
- Each decision lives in one place, the Decisions list, and is edited in place when it changes. The body points at its number; it never restates it. No "Added later" banners or dated layers: rewrite the section.
- Anything a fact or an agreed rule can't settle is an open ask, never prose inside an agreed section. Anything one can settle, settle, and say which settled it.
- Status is `draft` while any ask is open. It becomes `agreed` only when the user has answered them all; record the date in each decision.
- Anything that comes up after the spec is agreed is an addendum, whoever finds it. It gets the same premise check as a piece and a cold read of its own. One that holds a decision waits for the user's answer. Nothing in an addendum is built until then.
- One `/go` per spec, with as few pieces as the files allow. Work that ships together stays in one spec. Fold pieces that share files, or that exist only for each other, into one piece.
- A shared change applied in three or more places starts with a tracer bullet: the shared change plus one consumer, built end to end first. Pieces applying it elsewhere name that tracer in `after:`.
- Check every Decision and Piece against Meridian's Laws. A design that breaks one is not an option: change the design. If no design inside the Laws does the job, report that as a finding for the user, naming the Law.
- No runbooks or long scripts inline. Link to a file in `<main checkout>/.plans/scratch/` instead.
- Plain English; gloss jargon on first use.

## 5. Cold read

Start one fresh cold-reader subagent whenever subagents are available. Before writing its brief, resolve `<main checkout>`, the spec path, the report path, the repo's instructions, and every Meridian file to absolute paths. The brief must contain all of these and every rule the cold reader relies on:

- **Main checkout:** the resolved absolute main working tree.
- **Spec:** the resolved absolute path to the active spec.
- **Source paths:** every source file the spec cites that the cold reader must read.
- **Doctrine:** the absolute paths of Meridian's `SKILL.md`, the references the spec names, and the repo's instructions.
- **Scope:** read the spec and its cited files; never edit code, run builds, run the gate, or commit.
- **Rules:** list anything that could not be built without asking; any `file:line` that does not say what the spec claims; any two pieces that touch the same file; any decision restated or contradicted in the body; any existing code the spec skips, replaces, or changes without listing everything that code does; any Done-means check that cannot be run as written; any ambiguous source the spec cites; any missing tracer bullet; and any Decision or Piece that breaks a Meridian Law, naming the Law. Report facts and findings only, with no recommendation, option, confidence, or ask.
- **Report path:** the resolved absolute path to `<main checkout>/.plans/scratch/spec/cold-read.md`.
- **Save protocol:** save the report with a shell heredoc, `cat > <path> <<'EOF'` … `EOF`, not a file-writing tool; if saving is refused, reply with the whole list.
- **Reply protocol:** reply with only the report path.

The cold-reader brief may not rely on the premise report, an earlier artifact, a sibling skill, prior conversation, or another agent's instructions to understand the task. Fix what the cold reader finds in the spec. When a finding shows the code is wrong, not just the spec's account of it, put it into a piece or an addendum. Its questions that only the user can answer become open asks.

When no subagents are available, skip the cold read and report it as skipped for that reason.

A draft that changes in substance after its cold read gets the changed parts cold-read again before the report calls it ready. Recording the user's answers, or renumbering, doesn't count as a change.

## 6. Report

```
**TLDR:** <plain English: what the spec sets out to do>
**Findings:** 1. <finding that changes the picture, stated in full>, or none
**Spec:** <absolute spec path> · status <status> · <n> pieces · cold read <done | skipped: no subagents>
**Premise:** <holds, or the correction>
**Parked:** 1. <item> (rec: fold in | leave, why), or none
**Needs from you:** 1. <open ask> (rec: …) · last item: answer the asks, then run /go <spec path>
```

**Needs from you** follows AGENTS.md 'Reports'.

When the user answers, update the active spec in place: the decision, its date, and the status.
