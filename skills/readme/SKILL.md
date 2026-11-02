---
name: readme
description: Bring a repo's README up to date with the code and into the house shape and voice, or write one in that shape. Use when the user runs /readme or asks to update, check, restyle, or write a README. Edits the README and leaves it uncommitted.
argument-hint: "[path]"
---

# Readme

Arguments: what the user typed after `/readme`.

- Empty: update the README at the repo root.
- A path: update that README instead (a package's, say).
- No README at the path: write one.

Every run leaves the README in the house shape and voice below, whatever shape it arrived in. The README describes what a user gets and does. Leave it uncommitted; never commit, push, or tag.

AGENTS.md is the workflow-skills shared rules file your agent loads as its rules, not the repo's own AGENTS.md.

"The repo's instructions" are defined in AGENTS.md 'Routines'.

## 1. Find what changed

- Base: `git log -1 --format='%h %cs' -- <README>`, the last commit that touched it.
- Since then: `git log --oneline <base>..HEAD`, `git diff --stat <base>..HEAD`, and the uncommitted work (`git status --short`, `git diff HEAD --stat`). Read the CHANGELOG entries since the base if there is one.
- Read the repo's instructions. A docs-voice line there wins over the house voice below.
- Keep what a user sees: a new command, skill, flag, argument, setting, prerequisite, or version; a renamed or removed one; a changed default or limit. Internal changes (refactors, tests, review fixes with no visible effect) don't reach the README.

## 2. Check every claim

Read the whole README, not just the parts near the changes. Check each command, flag, argument, version, path, count ("three adapters"), and link against the repo as it is now: run `--help`, read the source or the manifest, and `ls` the path. Facts come from files, not from memory or the old README. A claim you can't check from here (a third-party tool's behaviour, a live service) stays, and goes in the report as unchecked.

## 3. Edit

- Fix what's stale, add what's new, and delete what's gone. Each fact lives in one section; elsewhere, link to it.
- Move the README into the house shape and voice. Restyling moves facts and rewrites sentences; it never drops a true fact. A fact with no slot of its own goes beside its nearest sibling, and an old section that doesn't match a slot becomes a bullet under "Also in the box" or a subsection of the slot it serves.
- A new item goes where its siblings are: a new command in the commands table, a new flag beside the other flags, a new guide under "Also in the box".
- When the repo has a docs site, the README carries the summary and links to the page; it doesn't copy the page.
- Sweep: the same stale fact in other user-facing text (a docs page, install output, `--help` text) gets fixed in the same pass, and named in the report.

## 4. Verify

- Every relative link points at a file that exists, and every `#anchor` matches a heading's GitHub slug (lowercase, spaces to hyphens, punctuation dropped).
- Every code block runs as written against this repo, or is plainly a placeholder (`<agent>`, `<path>`). Run the quick ones; leave long or state-changing ones to the report.
- Read the README's diff before you report.

## House shape

Top to bottom. A section with nothing to say is left out, never filled.

1. **Title block:** a centred `<h1>` with badges for the package registry and the license. Only badges that resolve: no published package, no package badge; no `LICENSE` file, no license badge.
2. **Thesis:** one bold sentence that says what the tool believes ("**Your schema is the contract.**"). Then what it does, in mechanism terms, and the awkward parts it handles for the reader.
3. **Positioning:** a short paragraph placing it against what the reader already knows or what it replaces ("the same result as a folder of nightly cron jobs, but the rule sits next to the data it governs"), and the one guarantee worth stating ("startup refuses a configuration it can't run safely").
4. **Prerequisites:** bullets with exact versions, each saying what it's for when that isn't obvious ("Node.js, only for the TypeScript client").
5. **Install:** one shell block, the fewest commands that work. A known harmless warning gets one sentence after it.
6. **"Three steps in"** (or "Two ways in"): numbered `###` headings phrased as what the reader does ("1. Mark the tables you keep"), each a short, complete code block, then a paragraph on what the non-obvious parts mean and any rule the reader must keep ("Never change it.").
7. **The payoff:** "Run it", "Serve it", or "Use it", ending on a concrete outcome in plain words ("thirty-day-old drafts are deleted, and the run is written to the audit log"; "`POST /api/members` answers `201` with the new member").
8. **Also in the box:** bullets, each a link to its guide, a colon, and one or two sentences on what it does for the reader.
9. **Documentation:** one row of links separated by ` · `, ending on the limitations page with a parenthetical ("(what it deliberately doesn't do)").
10. **License:** a link to the `LICENSE` file, only when it exists.

A repo that isn't a package (a skills or tooling repo) keeps the order but swaps parts in: a table of what it provides in place of the steps, "in practice" prose as the payoff, and per-platform install sections.

## House voice

- Narrated, second person, with personality: the author explaining the tool to a peer. Short declarative sentences.
- Concrete over abstract: a named type, a real command, the status code that comes back.
- Honest limits up front ("Postgres only"). A limitation is stated, not hidden in a footnote.
- No marketing: no "powerful", "seamless", "blazing", "robust", "effortless", or "simply"; no emoji; no exclamation marks.
- Gloss jargon on first use.
- Code samples compile as shown and use the domain the README already uses, not `foo` and `bar`.

## Report

```
**TLDR:** <plain English: what the README now says that it didn't>
**Changed:** <section: what changed, one line each, including what moved where>
**Swept:** <other files fixed for the same fact, or none>
**Unchecked:** <claims left as they were because they can't be checked from here, or none>
**Gaps:** <what the README can't honestly say yet (no LICENSE, a broken command), or none>
```
