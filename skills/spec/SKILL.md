---
name: spec
description: Turn the agreed work into one .plans/spec-<name>.md that /go builds from and /cycle reviews against. Use when the user runs /spec or asks for a spec of the work. Writes no code.
argument-hint: "[name | spec path] [quick]"
---

# Spec

Arguments: what the user typed after `/spec`, or what they named when asking for a spec.

- A name (`account-link-limit`) writes `<main checkout>/.plans/spec-<name>.md`. A path to an existing spec updates it in place. Empty means the work discussed in this conversation, named by you.
- `quick`: skip the cold read (step 4).

A spec is the one place the agreed work lives: `/go` builds from it without re-asking, and `/cycle` reviews the diff against it. /spec writes that doc and nothing else. It never edits code, runs builds or the gate, or commits.

Skip it for a single small piece (`/go`'s threshold: a few files and no new seam): the conversation is spec enough.

AGENTS.md is the workflow-skills shared rules file your agent loads as its rules, not the repo's own AGENTS.md.

Working files go in `<main checkout>/.plans/`, as AGENTS.md 'Routines' defines it.

"The repo's instructions" are defined in AGENTS.md 'Routines'.

## 1. Gather

- Find the intent: this conversation, the user's answers, and any `.plans/` doc, backlog, or waypoint it came from.
- Look for an existing spec of the same work (`ls <main checkout>/.plans/`, grep the topic). If one exists, update it; never write a `-v2` or a second doc beside it. A replacement marks the old one `Superseded by:` in its header.
- Load `meridian` and read the references the work touches.

## 2. Check the premise against HEAD

- If you can start subagents, a fresh one (the fact-gatherer) does the reading. Give it the ask and the areas it touches, plus the rules below. It never edits code, runs builds or the gate, or commits. It returns the facts with `file:line` and the short SHA, and, for any code the work skips, replaces, or changes, everything that code does today. It saves them to `<main checkout>/.plans/scratch/spec-<name>/premise.md` (absolute path) with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`) and replies with only the path; if saving is refused, it replies with the facts instead. Check the claims the spec rests on yourself, then write it: the decisions stay yours. Without subagents, do the reading yourself.
- Read the code the work touches. Facts come from files, not memory: cite `file:line`, and record the short SHA the spec was written against.
- When the work skips, replaces, or changes existing code (a handler it bypasses, a list it adds to, a function it swaps out), write down everything that code does today, not only the part this work is about. Skipping code skips all of it.
- Say what the ask assumed and what HEAD shows. A wrong premise changes the spec before anything else does.
- Check end to end whatever the work relies on — a feature, a gate, or a tool: run it, or trace it from input to output, and record what it actually does. Reading its name is not enough.
- For each change, name what it reuses: the existing component, flow, pattern, or library. Hand-rolling needs a reason in the spec.
- Root cause, not symptom. A gap goes in as work, never as a note that it exists.

## 3. Write the spec

Write it at `<main checkout>/.plans/spec-<name>.md`. Use this shape. Leave out a section that would be empty, except Open asks and Out of scope, which say "none".

- `<session name>` is this session's own name, if you can find it (a list of agent sessions, where you can get one, may name this one first); otherwise leave the Session field out.
- `<name>` in a decision is the user, by their real name, because other people read the spec: from the conversation, else `git config user.name`.

```markdown
# Spec: <title>

**Status:** draft | agreed | building | built (<hash>) · **Written:** <YYYY-MM-DD> against <repo>@<sha> · **Session:** <session name>
**Source:** <docs or conversation it came from> · **Depends on:** <other specs, or none> · **Supersedes:** <path, or none>

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

- No two pieces own the same file. That is `/go`'s split. When one file has to be shared (a locale file, say), name it and say which piece edits it last.
- Each decision lives in one place, the Decisions list, and is edited in place when it changes. The body points at its number; it never restates it. No "Added later" banners or dated layers: rewrite the section.
- Anything a fact or an agreed rule can't settle is an open ask, never prose inside an agreed section. Anything one can settle, settle, and say which settled it.
- Status is `draft` while any ask is open. It becomes `agreed` only when the user has answered them all; record the date in each decision.
- Anything that comes up after the spec is agreed is an addendum, whoever finds it (`/go`'s orchestrator, a builder, `/cycle`). It gets the same premise check as a piece and a cold read of its own (step 4, given only the addendum and the files it cites). One that holds a decision waits for the user's answer. Nothing in an addendum is built until then.
- One /go per spec, with as few pieces as the files allow. Each /go is expensive: it briefs, integrates, and checks on its own, and every piece is a builder. Work that ships together stays in one spec, however long the doc gets. Fold pieces that share files, or that exist only for each other, into one piece. Split into parts (one spec per part, plus a short index spec that lists them in order with their statuses) only when one /go can't hold the work: parts that ship separately, or a part that needs another merged first.
- Check every Decision and Piece against meridian's Laws. A design that breaks one isn't an option: change the design, even when the fix is bigger. If no design inside the Laws does the job, that's a finding for the user naming the Law, never a Decision.
- No runbooks or long scripts inline. Link to a file in `<main checkout>/.plans/scratch/` instead.
- Plain English; gloss jargon on first use.

## 4. Cold read

Unless `quick`, or you can't start subagents: start one fresh subagent, the cold reader (a new agent that starts with only what you give it, not a fork of this conversation) with only the spec's path, the repo's instructions, and meridian's SKILL.md. Its brief is to read the spec and the files it cites, then list:

- anything it couldn't build without asking;
- any `file:line` that doesn't say what the spec claims;
- any two pieces that touch the same file;
- any decision that is restated or contradicted in the body;
- any existing code the spec skips, replaces, or changes without listing everything that code does: read the code and list what the spec left out;
- any Done-means check that can't be run as written (a command the repo doesn't have, a wrong path, a step nobody can take);
- any finding or source doc the spec cites that is ambiguous, or that a decision overrides without the spec saying which wins;
- any Decision or Piece that breaks a meridian Law, naming the Law.

It saves its list to `<main checkout>/.plans/scratch/spec-<name>/cold-read.md` (absolute path) with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), not its file-writing tool, and replies with only the path; if saving is refused, it replies with the whole list instead. Fix what it finds in the spec. Its questions that only the user can answer become open asks. When you skip the cold read because you can't start subagents, say so on the report's Spec line: nobody but its author has read it.

## 5. Report

```
**TLDR:** <plain English: what the spec sets out to do>
**Findings:** 1. <finding that changes the picture, stated in full>, or none
**Spec:** <absolute spec path> · status <status> · <n> pieces · cold read <done | skipped: quick | skipped: no subagents>
**Premise:** <holds, or the correction>
**Parked:** 1. <item> (rec: fold in | leave, why), or none
**Needs from you:** 1. <open ask> (rec: …) · last item: answer the asks, then run /go <spec path>
```

**Needs from you** follows AGENTS.md 'Reports'.

When the user answers, update the spec in place: the decision, its date, and the status.
