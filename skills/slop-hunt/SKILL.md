---
name: slop-hunt
description: Independent read-only slop hunt over one or more repo paths (hand-rolled machinery, over-engineering, WET, dead code, ceremony, oversized files), ranked with replacements and LOC saved. Use when the user runs /slop-hunt or asks for a slop hunt / slop review / anti-slop sweep.
argument-hint: "<path> [<path>…] [spec]"
---

# Slop hunt

Arguments: what the user typed after `/slop-hunt`, or the paths they named when asking for a hunt. Paths are relative to the current repo. A trailing `spec` means: also write one spec per repo, in the `/spec` shape, so `/go` can build it (step 4).

Working files go in `<main checkout>/.plans/`. `<main checkout>` is a repo's main working tree, `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`, even when you run in a worktree: a worktree can be removed or auto-cleaned, and its git-ignored `.plans/` goes with it. If `git check-ignore -q .plans/` fails there, add `.plans/` to `.git/info/exclude`, which ignores it locally without touching the repo's `.gitignore`.

## 0. Preflight (always)

For every path, resolve it and print one line before starting: `<path> → <absolute path> · repo <name> · HEAD <short hash> (<branch>)`.
- If a path doesn't exist, stop and ask. Never substitute a similar-looking repo (`../tandem-ts` vs `../rivet-ts`).
- If a path resolves to an unexpected repo, show it and ask before going on.

## 1. Read the doctrine first

Load the `meridian` skill, then read each repo's instructions: its AGENTS.md, or, when it has none, the agent instructions file in the repo root (such as CLAUDE.md or GEMINI.md). **Don't read any existing review docs until your own pass is done.** After that, tag each finding NEW or ALREADY-COVERED.

## 2. Look for

- **Hand-rolled machinery the platform already provides** (BCL, EF/ORM, driver, Microsoft.Extensions, framework, a well-known library): retries, timeouts, scheduling, locking, serialisation, identifier quoting, options validation, type mapping, reflection where metadata already exists.
- **Over-engineering:**
  - single-implementation interfaces with no real seam;
  - forwarding shells or wrappers, a "Core" with thin shells around it;
  - strategy or registry patterns for two cases;
  - one-off generic abstractions;
  - the same thing validated again in several layers.
- **WET** (the same thing written twice): duplicated SQL or queries, near-identical pipelines or records, repeated helpers and constants.
- **Dead code:** unused types, members, parameters, and options. Grep to prove each one is unused.
- **Ceremony:**
  - comments that restate the code;
  - defensive null checks on non-nullable values;
  - exception → result → exception round trips;
  - test hooks in production code.
- **Files whose size is out of proportion** to what they do. Rank by lines of code.

Use subagents when the paths are large and you can start them, one per repo or major area; without them, hunt each area yourself in turn. Give each the list above, the read-only rule, and its report file: `<main checkout>/.plans/scratch/slop-hunt/report-<repo or area>.md` (absolute path, in the current repo's main checkout). It saves the report with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), not its file-writing tool, and replies with only the path; if saving is refused, it replies with the whole report instead. Check their findings yourself before reporting.

## 3. Report

**Don't edit anything** outside `.plans/`. Report a ranked list per repo, most impactful first. Each finding:

`#N · file:line · what it is · replace with <the specific API or library> · ~LOC saved · NEW|ALREADY-COVERED`

End each repo with an estimated total LOC saved and the 3–5 lowest-risk wins to start with.

## 4. With `spec`

Write `<main checkout>/.plans/spec-slop-hunt-<area>.md` in each repo (that repo's own main checkout: `git -C <path> rev-parse …`), in the shape and by the rules of step 3 of `/spec`. `<area>` is a short kebab-case name for the paths hunted in that repo (`api-cases` for `apps/api/Modules/Cases`), so a hunt over other paths gets its own spec. Read the shape and rules from `spec/SKILL.md` in the folder `cd -P "<base directory>/.." && pwd` prints (it follows a linked skill back to its repo), where `<base directory>` is the folder this SKILL.md was loaded from (the skill's base directory, if your agent printed one when the skill loaded, else the folder of the path you read this file at). If you can't tell where this file was loaded from, ask the user for the path rather than guessing. If that file is already there and reads `draft` or `agreed`, update it in place. If it reads `building` or `built`, it's earlier work: leave it and write `spec-slop-hunt-<area>-<YYYY-MM-DD>.md` instead.

It must be self-contained:
- **Pieces:** the findings grouped into work packets that can run in parallel, no two owning the same file. Bugs to fix first come first, and the pieces that depend on them say so in `after:`. Each piece names the meridian rule it serves and the replacement it reuses.
- **Done means:** the repo's ground rules that apply (its test, format, and lint commands, from its instructions).
- **Open asks:** the decisions the user needs to make, each with a recommendation. Status is `draft` while any is open.

Then present those open asks in chat, numbered, each with its recommendation, ending with: answer them, then run `/go <spec path>`. Stop there.
