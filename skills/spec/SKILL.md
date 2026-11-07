---
name: spec
description: Turn the agreed work into a deterministic named spec at <main checkout>/.plans/spec-<slug>.md that /go builds from and /cycle reviews against. Use when the user runs /spec or asks for a spec of the work. Takes no arguments and writes no code.
---

# Spec

`/spec` takes no arguments. If the user supplies any argument, stop before gathering or writing and state that `/spec` takes no arguments.

A spec is the one place the agreed work lives: `/go` builds from it without re-asking, and `/cycle` reviews the diff against it. `/spec` writes that document and nothing else. It never edits code, runs builds or the gate, or commits.

The spec is `<main checkout>/.plans/spec-<slug>.md`. Its premise report is `<main checkout>/.plans/scratch/<spec stem>/premise.md`, and its cold-read report is `<main checkout>/.plans/scratch/<spec stem>/cold-read.md`. The spec stem is the spec filename without `.md`, including any numeric suffix.

AGENTS.md is the workflow-skills shared rules file your agent loads as its rules, not the repo's own AGENTS.md.

Working files go in `<main checkout>/.plans/`, as AGENTS.md 'Routines' defines it.

`<base directory>` is the folder this `SKILL.md` was loaded from: the skill's base directory, if your agent printed one when the skill loaded, else the folder of the path you read this file at. If you can't tell where this file was loaded from, ask the user for the path rather than guessing.

`<bundle>` is `<base directory>/references/bundles/spec.md`: the house rules this routine and its subagents read, in one file, the Laws first. A rule the bundle cites by its library path, such as `invariants/concurrency-review.md`, is in the bundle under its `<!-- rule: <path> -->` line.
## 1. Gather

- Find the intent in this conversation, the user's answers, and any document, backlog, or waypoint the work names. If there is none, stop: say that `/spec` needs the work agreed in the conversation first, and write nothing.
- Read `<bundle>` in full.

## 2. Choose and manage the named spec

After gathering, derive the title identity and slug from the agreed title. When the conversation, a waypoint, or a document names an existing spec, its `# Spec:` title is the title. Otherwise write a title from the intent and state it in a line.

To derive the title identity, normalize the title to Unicode NFC, lowercase it, replace every character that is neither a Unicode letter nor a Unicode digit with a hyphen, collapse hyphen runs, and trim boundary hyphens. An empty title identity stops the routine and asks for a title that can form a slug.

To derive the slug: if the title identity is longer than 48 characters, cut it to the first 48, then back to the last hyphen in them when there is one, and trim any trailing hyphen. Otherwise the slug is the title identity.

List every `<main checkout>/.plans/spec-<slug>.md` and `<main checkout>/.plans/spec-<slug>-<n>.md`, in number order. Stop at one that is unreadable or has no readable title. Use the first whose title identity matches. Otherwise use the lowest free name, with `<n>` starting at 2.

For a matching existing candidate, parse:

- the title from the first `# Spec: <title>` heading;
- the status from the `**Status:**` line, which must be `draft`, `agreed`, `building`, or `built (<hash>)`;
- the previous HEAD from the `**Written:** … against <repo>@<sha>` line.

Then apply the status rule:

- A new spec is draft or agreed, according to whether any ask is open.
- A draft or agreed named spec is updated in place.
- A building named spec asks the user to continue or replace it; continue updates the same file and preserves `building` and its `**Built pieces:**` line as it stands, while replace overwrites that exact file and records `Supersedes: <previous title> (<previous HEAD>)`.
- A built named spec asks the user only whether to replace it. Replace overwrites that exact file and records `Supersedes: <previous title> (<previous HEAD>)`.
- An unreadable file, an unrecognized status, an unreadable title, or an unreadable HEAD stops the routine. Ask the user to repair the file or replace it.

## 3. Check the premise against HEAD

Create `<main checkout>/.plans/scratch/<spec stem>/` with `mkdir -p`, after AGENTS.md's `.plans/` ignore check.

When you can start subagents, a fresh fact-gatherer does the reading. Before writing its brief, resolve `<main checkout>`, the report path, the source paths, the repo's instructions, and `<bundle>` to absolute paths. The brief must contain all of these and every rule the fact-gatherer relies on:

- **Main checkout:** the resolved absolute main working tree.
- **Ask:** the agreed work, written in full.
- **Scope:** read the ask and the source files the work touches; never edit code, run builds, run the gate, or commit.
- **Source paths:** the exact absolute files to read.
- **Doctrine:** the absolute path of `<bundle>`, to read in full before anything else, and the repo's instructions. A rule the bundle cites by its library path, such as `invariants/concurrency-review.md`, is in the bundle under its `<!-- rule: <path> -->` line.- **Rules:** report facts with `file:line` and the short SHA; facts come from files, not memory; for any code the work skips, replaces, or changes, record everything that code does today; trace any feature, gate, or tool the work relies on from input to output; report facts only, with no recommendation, option, confidence, or ask.
- **Report path:** the resolved absolute path to `<main checkout>/.plans/scratch/<spec stem>/premise.md`.
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

Write the chosen candidate at its resolved absolute path. Use this shape. Leave out a section that would be empty, except Open asks and Out of scope, which say "none".

- `<session name>` is this session's own name, if you can find it; otherwise leave the Session field out.
- `<name>` in a decision is the user, by their real name: from the conversation, else `git config user.name`.
- `<previous title> (<previous HEAD>)` is the value derived in step 2 when this run replaces an existing spec; otherwise `Supersedes:` is `none`.

```markdown
# Spec: <title>

**Status:** draft | agreed | building | built (<hash>) · **Written:** <YYYY-MM-DD> against <repo>@<sha> · **Session:** <session name>
**Source:** <docs or conversation it came from> · **Depends on:** <other specs, or none> · **Supersedes:** <previous title> (<previous HEAD>), or none

## Intent
3–5 plain-English sentences: what is true for the user once this ships. No history of how it was found. /cycle reviews against this.

## Premise check
What the ask assumed, what HEAD shows, and any correction.

## Decisions
1. **<decision>.** <what and why>. <Agreed by <name>, YYYY-MM-DD | Chosen by the agent when <name> handed it back>.

## Open asks
1. <question> (rec: <answer>; settled by <what would settle it>)

## Pieces
**Built pieces:** none
### P1 <name> · owns: <files> · after: <piece, or none>
- **At HEAD:** <the code, by symbol and a short quoted fragment, and what it does now>
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
- **At HEAD:** <the code, by symbol and a short quoted fragment, and everything it does now>
- **Change:** <what changes>
- **Proof:** <test to extend, or new test>
<Agreed by <name>, YYYY-MM-DD | No decision in it>
```

Rules for the doc:

- No two pieces own the same file. That is `/go`'s split. When one file has to be shared, name it and say which piece edits it last.
- `**Built pieces:**` lists what has been built: `/spec` writes `none` on a new or replaced spec and keeps a continued spec's line as it stands; `/go` adds a piece's or addendum's id when its last brief has passed step 4, and `/cycle` adds one when a round ends with no unbuilt requirement open against a piece or addendum the line omits, whether its fixers closed them or its reviewer found none.
- Each decision lives in one place, the Decisions list, and is edited in place when it changes. The body points at its number; it never restates it. No "Added later" banners or dated layers: rewrite the section.
- A Decision states what was decided and why, never the options it beat: no alternative, rejected option, or its cost. An option still open is an ask, with its recommendation.
- Anything a fact or an agreed rule can't settle is an open ask, never prose inside an agreed section. Anything one can settle, settle, and say which settled it.
- Status is `draft` while any ask is open. It becomes `agreed` only when the user has answered them all; record the date in each decision.
- Anything that comes up after the spec is agreed is an addendum, whoever finds it. It gets the same premise check as a piece and a cold read of its own. One that holds a decision waits for the user's answer. Nothing in an addendum is built until then.
- One `/go` per spec, with as few pieces as the files allow. Work that ships together stays in one spec. Fold pieces that share files, or that exist only for each other, into one piece.
- A shared change applied in three or more places starts with a tracer bullet: the shared change plus one consumer, built end to end first. Pieces applying it elsewhere name that tracer in `after:`.
- Check every Decision and Piece against the house Laws, at the top of `<bundle>`, and the full rules behind them, in the bundle. A design that breaks one is not an option: change the design. If no design inside the Laws does the job, report that as a finding for the user, naming the Law.
- Point at code by symbol and a short quoted fragment everywhere but the Premise check ("the `Suppress` block around `RunModelPassAsync`"), never by line number: every builder edit shifts line numbers, and a stale one points at the wrong code while looking precise. Line numbers belong only in the Premise check, read at the `**Written:**` commit or with the commit they were read at beside them ("throws at `CohortSchemaValidator.cs:29` at 6bd7eab").
- No runbooks or long scripts inline. Link to a file in `<main checkout>/.plans/scratch/` instead.
- Plain English; gloss jargon on first use.

## 5. Cold read

Start one fresh cold-reader subagent whenever subagents are available. Before writing its brief, resolve `<main checkout>`, the spec path, the report path, the repo's instructions, and `<bundle>` to absolute paths. The brief must contain all of these and every rule the cold reader relies on:

- **Main checkout:** the resolved absolute main working tree.
- **Spec:** the resolved absolute path to the chosen named spec.
- **Source paths:** every source file the spec cites that the cold reader must read.
- **Doctrine:** the absolute path of `<bundle>`, to read in full before anything else, and the repo's instructions. A rule the bundle cites by its library path, such as `invariants/concurrency-review.md`, is in the bundle under its `<!-- rule: <path> -->` line.- **Scope:** read the spec and its cited files; never edit code, run builds, run the gate, or commit.
- **Rules:** list anything that could not be built without asking; any `file:line` in the Premise check that does not say what the spec claims at the commit it was read at; any line number outside the Premise check; any symbol or quoted fragment that doesn't lead to the code the spec means; any two pieces that touch the same file; any decision restated or contradicted in the body; any Decision that names an alternative, a rejected option, or its cost; any existing code the spec skips, replaces, or changes without listing everything that code does; any Done-means check that cannot be run as written; any ambiguous source the spec cites; any missing tracer bullet; and any Decision or Piece that breaks a house Law in the bundle, naming the Law. Report facts and findings only, with no recommendation, option, confidence, or ask.
- **Report path:** the resolved absolute path to `<main checkout>/.plans/scratch/<spec stem>/cold-read.md`.
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

When the user answers, update the chosen named spec in place: the decision, its date, and the status.
