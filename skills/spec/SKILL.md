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

Skip it for a single small piece (under `/go`'s ~150-line threshold): the conversation is spec enough.

`<main checkout>` is the repo's main working tree, `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`, even when the work is in a worktree: a worktree can be removed or auto-cleaned, and its `.plans/` goes with it. Working files go in `<main checkout>/.plans/`. If `git check-ignore -q .plans/` fails there, add `.plans/` to `.git/info/exclude`, which ignores it locally without touching the repo's `.gitignore`.

"The repo's instructions" means its AGENTS.md, or, when it has none, the agent instructions file in the repo root (such as CLAUDE.md or GEMINI.md). They name the gate, the targeted test, format, and lint commands, the UI skill, and the paths never to commit. When they don't name something a step needs, say so in the report rather than guessing.

## 1. Gather

- Find the intent: this conversation, the user's answers, and any `.plans/` doc, backlog, or waypoint it came from.
- Look for an existing spec of the same work (`ls <main checkout>/.plans/`, grep the topic). If one exists, update it; never write a `-v2` or a second doc beside it. A replacement marks the old one `Superseded by:` in its header.
- Load `meridian` and read the references the work touches.

## 2. Check the premise against HEAD

- Read the code the work touches. Facts come from files, not memory: cite `file:line`, and record the short SHA the spec was written against.
- When the work skips, replaces, or changes existing code (a handler it bypasses, a list it adds to, a function it swaps out), write down everything that code does today, not only the part this work is about. Skipping code skips all of it.
- Say what the ask assumed and what HEAD shows. A wrong premise changes the spec before anything else does.
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
1. <question> (rec: <answer>; confidence <n>%; settled by <what would firm it up>)

## Pieces
### P1 <name> · owns: <files> · after: <piece, or none> · size: <~lines>
- **At HEAD:** <file:line, what it does now>
- **Reuse:** <component or pattern it follows>
- **Change:** <what changes>
- **Proof:** <test to extend, or new test; mark one that is red today>

## Invariants and docs
The INVARIANTS rule, doc page, or changelog line, written out in full.

## Done means
The targeted tests and checks with their exact commands. What stays uncommitted for /cycle. What only the user can do (a deploy, a live check).

## Out of scope
- <thing>: <why>

## Parked
- <found in passing>: <why it isn't this work>

## Addenda
### A1 <name> · <YYYY-MM-DD> · owns: <files> · after: <piece, or none>
- **Why:** <what came up, and in which step>
- **At HEAD:** <file:line, everything it does now>
- **Change:** <what changes>
- **Proof:** <test to extend, or new test>
<Agreed by <name>, YYYY-MM-DD | No decision in it>
```

Rules for the doc:

- **No two pieces own the same file.** That is `/go`'s split. When one file has to be shared (a locale file, say), name it and say which piece edits it last.
- **Each decision lives in one place**, the Decisions list, and is edited in place when it changes. The body points at its number; it never restates it. No "Added later" banners or dated layers: rewrite the section.
- **Anything under 95% sure is an open ask**, not prose inside an agreed section.
- **Status is `draft` while any ask is open.** It becomes `agreed` only when the user has answered them all; record the date in each decision.
- **Anything that comes up after the spec is agreed is an addendum**, whoever finds it (`/go`'s orchestrator, a builder, `/cycle`). It gets the same premise check as a piece and a cold read of its own (step 4, given only the addendum and the files it cites). One that holds a decision waits for the user's answer. Nothing in an addendum is built until then.
- **Keep it buildable.** Over ~400 lines, or more than one /go's worth, means split it: one spec per part, plus a short index spec that lists them in order with their statuses.
- No runbooks or long scripts inline. Link to a file in `<main checkout>/.plans/scratch/` instead.
- Plain English; gloss jargon on first use.

## 4. Cold read

Unless `quick`, or you can't start subagents: start one fresh subagent (a new agent that starts with only what you give it, not a fork of this conversation) with only the spec's path and the repo's instructions. Its brief is to read the spec and the files it cites, then list:

- anything it couldn't build without asking;
- any `file:line` that doesn't say what the spec claims;
- any two pieces that touch the same file;
- any decision that is restated or contradicted in the body;
- any existing code the spec skips, replaces, or changes without listing everything that code does: read the code and list what the spec left out;
- any Done-means check that can't be run as written (a command the repo doesn't have, a wrong path, a step nobody can take);
- any finding or source doc the spec cites that is ambiguous, or that a decision overrides without the spec saying which wins.

It saves its list to `<main checkout>/.plans/scratch/spec-<name>/cold-read.md` (absolute path) with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), not its file-writing tool, and replies with only the path; if saving is refused, it replies with the whole list instead. Fix what it finds in the spec. Its questions that only the user can answer become open asks. When you skip the cold read because you can't start subagents, say so on the report's Spec line: nobody but its author has read it.

## 5. Report

```
**TLDR:** <plain English: what the spec sets out to do>
**Spec:** <absolute spec path> · status <status> · <n> pieces · ~<lines> lines of change · cold read <done | skipped: quick | skipped: no subagents>
**Premise:** <holds, or the correction>
**Needs from you:** 1. <open ask> (rec: …) · last item: answer the asks, then run /go <spec path>
```

**Needs from you** lists every step that now waits on the user (a decision, an approval, or an action only they take, such as running /go, pushing, or a live check), each with your recommendation and numbered so they can answer "1. yes 2. no". Write "nothing" only when nothing waits on them. Never add an item to fill the list; each one serves the user's goal and you've checked it yourself.

When the user answers, update the spec in place: the decision, its date, and the status.
