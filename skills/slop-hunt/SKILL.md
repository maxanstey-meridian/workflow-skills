---
name: slop-hunt
description: Independent read-only slop hunt over one or more repo paths (hand-rolled machinery, silent failures, defensive bloat, speculative abstraction, WET, dead code, compat layers, ceremony, test slop, oversized files), each finding proven and ranked with its replacement and what it removes. Use when the user runs /slop-hunt or asks for a slop hunt / slop review / anti-slop sweep.
argument-hint: "<path> [<path>…] [spec]"
---

# Slop hunt

Arguments: what the user typed after `/slop-hunt`, or the paths they named when asking for a hunt. Paths are relative to the current repo. A trailing `spec` means: also write one spec per repo, in the `/spec` shape, so `/go` can build it (step 6). No path: ask which, and stop.

A hunt finds code that can be deleted or replaced with something the platform, a library, or the repo itself already provides, **without changing what the app does**. It is read-only: it edits nothing outside `.plans/`, and runs no build, test, or gate. It isn't a bug hunt. A bug a hunter trips over gets one unchecked line under **Also noticed**, after the ranking; only one that loses data or opens a security hole goes first (step 5).

Assume the code is a mature enterprise app, not spaghetti: it has conventions, and they're deliberate. The house way is the baseline. Slop is drift from it, machinery the platform already gives, and code that can go at no cost. A convention you'd have chosen differently is not slop. A convention that breaks a meridian Law or Default (a generic repository over EF, every generated client wrapped one-for-one, a custom logging facade) is one finding for the convention, with every place it's used counted, not one finding per place.

**Precision over recall.** A missed finding costs less than a wrong one (`references/hunting.md`, "How to read an area").

**No finding uses up another's protection.** A protection is whatever stops a behaviour from breaking unnoticed: a test, a guard, a validator, a constraint, or a type. No finding's proof may rest on a protection another finding removes (`references/hunting.md`; checked in step 4).

Terms used below:

- **AGENTS.md** is the workflow-skills shared rules file your agent loads as its rules, not the repo's own AGENTS.md.
- **The repo's instructions** are as AGENTS.md 'Routines' defines them.
- **`<main checkout>`** is as AGENTS.md 'Routines' defines it, for the hunted repo, not the repo the session runs in. Each hunted repo has its own: the hunt's files go in the first path's repo, the earlier-hunts check (step 4) reads each hunted repo's, and with `spec` step 6 writes each repo's spec in its own.
- **`<solution>`** is the `.sln` or `.slnx` that contains the hunted projects; with none, each hunted project file in turn.
- **`<base directory>`** is the folder this SKILL.md was loaded from: the skill's base directory, if your agent printed one when the skill loaded, else the folder of the path you read this file at. **`<skills folder>`** is what `cd -P "<base directory>/.." && pwd` prints, which follows a linked skill back to its repo. If you can't tell where this file was loaded from, ask the user for the path rather than guessing.
- **`<id8>`** is the last 8 characters of this session's id, found as AGENTS.md 'Routines' describes (if it prints nothing, use the id this conversation states, else `openssl rand -hex 4` once). **`<name>`** is a short kebab-case name for the paths hunted (`api-cases` for `apps/api/Modules/Cases`), so a hunt over other paths gets its own folder and spec. **`<hunt folder>`** is `<main checkout>/.plans/scratch/slop-hunt-<id8>-<name>/`. Create it (`mkdir -p`, after AGENTS.md's `.plans/` ignore check) and name it in your first message, so it survives a compaction.
- **`<root>`** is the root of the repo a path belongs to. Run each repo's commands there (`git -C <root>`, or `cd <root>` first), since a hunted path may be in another repo.

## 0. Preflight

For every path, resolve it and print one line before starting: `<path> → <absolute path> · repo <repo> · HEAD <short hash> (<branch>) · <clean | n uncommitted files>`.

- If a path doesn't exist, stop and ask. Never substitute a similar-looking repo (`../tandem-ts` vs `../rivet-ts`).
- If a path resolves to an unexpected repo, show it and ask before going on.
- Uncommitted files under a path may be another session's work in progress. Hunt them as they stand; the hunters mark findings in them `(uncommitted)` (step 3).
- Say which projects or packages are **published**. A project counts when it explicitly sets `IsPackable` true or `GeneratePackageOnBuild` in its project file or `Directory.Build.props`, or when a CI pack, push, or publish step names it (`dotnet pack`, `nuget push`, `npm publish`). The SDK default doesn't count, because `IsPackable` defaults to true for non-test projects. A `package.json` with `publishConfig` counts; one merely missing `"private": true` doesn't. In a published project or package, a public type or member is never dead because nothing in the repo calls it (`references/hunting.md`, Dead code).

## 1. Read the doctrine

Load the `meridian` skill, then read each repo's instructions. Don't read earlier hunts or review docs until your own pass is done (step 4), so they don't steer it.

## 2. Map before you hunt

On a large codebase, the map decides what gets read. Do it in the main session; every hunter's brief comes from it. When the paths fit under item 5's guide (one area), skip the area split and run one hunter; keep the size, `baseline.md`, the hotspots (step 5 ranks by them), and the finders.

1. **Size it.** Count hand-written lines per top-level area, leaving out generated code (migrations, generated clients and contracts, `*.g.cs`, `*.Designer.cs`, `.nuxt/`), lockfiles, snapshots, vendored code, and fixtures. Run in `<root>`, `cloc --vcs='git ls-files --cached --others --exclude-standard -- <path>' --by-file --exclude-dir=Migrations,migrations,generated,fixtures,vendor,__snapshots__ --not-match-f='(\.g\.cs|\.Designer\.cs|lock\.json|\.lock|-lock\.yaml|\.snap)$'` does it (the `--vcs` command lists tracked and untracked files, and `<path>` goes inside it, not after it), or `scc` or `tokei` with the same excludes; without any of them, `git -C <root> ls-files -z --cached --others --exclude-standard -- <path>` through the same excludes (`grep -zv`) into `xargs -0 wc -l`, summed per area. Save the cloc output with `--csv --report-file=<hunt folder>/cloc.csv` and sum column 5 (`code`) per area (module or package folder) with `awk`, skipping the header row and the trailing `SUM` row; print that table, since item 5's split is made from it.
2. **Learn the house shape.** Read the solution or workspace layout, the composition root (`Program.cs` and the DI registration, or `nuxt.config` and plugins), and one representative slice end to end, from the endpoint or page down to persistence. Write the baseline to `<hunt folder>/baseline.md`, in a few lines: how a slice is laid out, which libraries do which job (validation, persistence, HTTP, results, logging, mapping), where deployment config lives (appsettings, Bicep or Terraform, pipelines), and the naming. Hunters judge drift against it.
3. **Find the hotspots.** Code that changes often costs most when it's heavy. `git -C <root> log --since=12.months --no-renames --format= --name-only -- <path> | grep -v '^$' | sort | uniq -c | sort -rn | head -40` gives churn; set it beside the size table. Big, high-churn files are read first and in full.
4. **Run the mechanical finders** that the repo already has, or that run without adding files to it, scoped to the hunted paths. Their output is leads, never findings: a hunter checks each lead by reading the code. Save each one's output to `<hunt folder>/leads-<tool>.txt`.
   - TypeScript: `knip` (unused files, exports, and dependencies; filter its output to the hunted paths, and on Nuxt run it only when `.nuxt/` is already prepared, since without it every auto-import reads as unused), and `npx jscpd@5 --reporters console --ignore '**/Migrations/**,**/migrations/**,**/generated/**,**/*.g.cs,**/*.Designer.cs,**/__snapshots__/**,**/vendor/**,**/fixtures/**,**/*lock.json,**/*.lock,**/*-lock.yaml,**/*.snap' <path>` (duplication; jscpd 5 respects `.gitignore` by default, but not the generated-code excludes, and without them migration snapshots and generated contracts swamp the real clones). Use the repo's own install of either, else `npx` with a pinned major (`npx knip@5`).
   - .NET: `dotnet format style <solution> --verify-no-changes --no-restore --severity hidden --diagnostics IDE0051 IDE0052 IDE0060 --include <path>` (unused private members and parameters, which IDE0051 and IDE0052 report only at `hidden`; it changes no source, and it needs the solution already restored). It also prints import-ordering and whitespace errors, so keep only the lines naming the three rules (`grep -E 'IDE00(51|52|60)'`). It writes design-time build output to `obj/` (git-ignored), so don't run it while another session's build or gate is running. `jscpd` covers C# too. JetBrains `jb inspectcode <solution> --no-build --swea -o=<hunt folder>/inspectcode.sarif` finds unused public and internal members, if it's installed.
   - The repo's own linter or doctrine checker (plumb, when its instructions name it).

   Never add a config file, package, or analyzer setting to the repo, or run a restore, build, or `nuxi prepare`, to make a finder run. One that can't run as things stand is skipped, and the report says so.
5. **Split into areas**: one per module, bounded context, or package, each one hunter can read in full (as a guide, up to about 8,000 hand-written lines). Add one **cross-cutting** area when there's more than one: shared kernel and infrastructure code, plus the duplication leads that span areas, because a per-area hunter can't see a copy in another area. Up to 8 hunters, the cross-cutting one included, run in one hunt; past that, merge neighbouring areas.
6. **Decide coverage.** Every hand-written file in scope belongs to one area. An area over the guide, once areas are merged, is read partly: its hotspots, and one example of each repeated pattern, in full, and the rest skimmed for shape (symbols and signatures, not bodies). Mark each file `full` or `skim` in the brief. A skimmed file is never called reviewed.

## 3. Hunt

Each area gets a hunter: a fresh subagent with the **reviewer** role (AGENTS.md 'Routines', Subagent models), one per area, in parallel. Without subagents, hunt each area yourself in turn, by the same brief. Every brief is self-contained and gives:

- the area's files, each marked `full` or `skim`, the area's uncommitted files, and the path of `<hunt folder>/baseline.md`;
- the absolute path of `<base directory>/references/hunting.md`, to read first: how to read an area, the signs, the proof each needs, what not to flag, and the report format;
- the meridian files to read, as absolute paths under `<skills folder>/meridian/`: `SKILL.md`, `references/coding-philosophy.md`, `references/invariants-and-concurrency.md`, plus `references/backend-pa-vsa.md` or `references/frontend-pa-vsa.md` for the side it reads (both for the cross-cutting area), and `references/testing-philosophy.md` when the area holds tests; the repo's instructions; and which projects or packages are published;
- its leads files from step 2;
- the short hash of its repo's HEAD, which opens its report;
- read-only: it edits nothing, runs no tests, builds, or gate, and saves only its report;
- its report file, `<hunt folder>/report-<area>.md` (absolute path). It saves the report with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), not its file-writing tool, and replies with only the path; if saving is refused, it replies with the whole report instead.

Read findings from the files, not the replies. If a hunter replies with its report instead of a path, save the reply to its named file verbatim before doing anything else, and say so in the report. After a compaction, a report is complete when it ends with its `Files read:` line and its first line's HEAD matches the current hunt's HEAD; rerun a hunter whose file isn't complete.

## 4. Verify

A hunter's report is claims (AGENTS.md 'Reports'). Before a finding reaches the user, it gets three checks: its proof, its cited commit, and its replacement at the repo's versions (the Proof, History, and Replacement bullets).

- **Who checks.** When the hunt holds more findings than you can recheck yourself (as a guide, over 30), start one fresh **verifier** per area report (a reviewer-role subagent). Brief it as step 3 briefs a hunter (every bullet but the leads files), with the area report's path in place of the area's file list. It keeps the `baseline.md` path and `hunting.md`, and gets `<hunt folder>/verify-<area>.md` as its output file. It does all three checks for every finding in its area and saves kept or dropped, and why, by finding number. Its "dropped" drops the finding. You do all three checks yourself for the findings you check: every `high`-risk finding, and with no verifiers, every finding. You also give every bug that opens the report the bug check. The Coverage line says which findings you checked, which the verifiers checked, and which stand on the hunter's word.
- **Proof.** Check it against the code, by the standard its sign sets in `hunting.md`. Without that proof, drop the finding.
- **History.** Read the commit the hunter cites for why the code is there (`git -C <root> show <hash>`). A guard or a copy that a bug-fix commit added stays unless the replacement keeps what it fixed, and the finding says how.
- **Replacement.** Confirm that the replacement exists at the version the repo is on: the package version in its project file, `Directory.Packages.props` (Central Package Management), `Directory.Build.props`, or `package.json`, and the resolved version in the lockfile (`packages.lock.json`, or the JS lockfile), then the installed package (`node_modules/<pkg>/package.json` and its types, `~/.nuget/packages/<id>/<version>/`, the target framework's API docs) or the official docs for that version. A replacement that adds a new dependency must already be a dependency of the repo, or meridian furniture; otherwise it's an open ask.
- **The bug check.** A bug (one that opens the report, or one the user picks in step 6) is checked by reading the code until the failure is shown, and by finding the commit that introduced its lines (`git -C <root> log -L <start>,<end>:<file> -s --format='%h %as %s'`). One that doesn't hold is dropped.
- Merge duplicates across areas: one finding, every location.
- Cross-check the protections. For each finding that removes or weakens a protection, the protection it names as remaining must not be removed or changed by any other finding. Where one finding's proof cites code another finding touches (B is dead only once A goes; the inner check is redundant only while the outer one stays), merge them into one finding, or re-prove the later one as if the earlier had landed. A protection with no named successor isn't slop: drop the finding.
- Then read earlier hunts and specs in `<main checkout>/.plans/` (`scratch/slop-hunt*` folders other than `<hunt folder>`, `spec-slop-hunt-*`, any spec still `building`), and the backlog the repo's instructions name, if any. Tag each finding `NEW`, or `ALREADY-COVERED (<doc>)`.

## 5. Rank and report

Rank by what the change removes (lines, types, concepts, dependencies), weighted by churn: slop in a hotspot is paid for every week. Break ties by lower risk. The finding line and the risk scale are the ones in `hunting.md` ("Your report"); add `NEW` or `ALREADY-COVERED (<doc>)` to each line. Then check the top ten yourself; if one drops, re-rank and check the one that moves up. Give the top 25 in full. Group the rest by sign, one short line each (`#N · NEW|ALREADY-COVERED · file:line · what · risk`), so the list stays readable.

The report is about the slop, and it leads with it. The hunters' **Also noticed** lines are bugs, not slop: list them after the ranking, unranked, one line each, marked unchecked unless you checked them. They aren't parked or put to the user as fold decisions, because triaging bugs isn't this routine's job; the user takes them elsewhere (this routine's report format wins over AGENTS.md 'Gaps get fixed' here). The one exception is a bug that loses data or opens a security hole: check it yourself. It moves to the `Findings:` line, stated in full, since it changes the picture (AGENTS.md 'Lead with what changes the picture'); one that doesn't hold is dropped.

Save the report to `<hunt folder>/report.md`, as AGENTS.md 'Routines' says to save a report, then give it (with `spec`, give it only at the end of step 6, with its `Spec:` line):

```
**TLDR:** <plain English: how heavy the code is, and where>
**Findings:** 1. <a broken premise, or a bug that loses data or opens a security hole, stated in full>, or none
**Paths:** <path> → <repo>@<short hash>
**Spec:** <absolute spec path> · status <status> · <n> pieces · cold read <done | skipped: no subagents> (spec mode only)
**Coverage:** <repo>: <n> areas · <full>/<files in scope> read in full, <skimmed> skimmed · finders run: <names> · skipped: <names, why> · verified: <by me: numbers> · <by verifiers: n> · <hunter's word: n>
**<repo>:** the ranked findings, most impactful first (top 25 in full, the rest grouped by sign)
**Start with:** 3–5 lowest-risk wins, by number
**Also noticed:** <bugs the hunters tripped over, one line each, file:line, (unchecked)>, or none
**Needs from you:** 1. … (rec: …); with no `spec`: say which findings (and any Also-noticed bugs) to take on, then run /slop-hunt <paths> spec
```

**Needs from you** is as AGENTS.md 'Reports' defines it.

## 6. With `spec`

Before building, look for this session's `<main checkout>/.plans/scratch/slop-hunt-<id8>-*/report.md` (the first path's repo, as Terms says) whose Paths line names the same paths. If one exists, its folder is the `<hunt folder>` and its `<name>` is the hunt's `<name>`. Only with no such folder, pick `<name>` as Terms says.

An earlier report matches when, for each path on its Paths line, `git -C <root> diff --quiet <hash> -- <path>` exits 0. That compares the working tree with that commit, so it covers new commits and uncommitted edits to tracked files.

- **Match:** build the spec from the report without hunting again. The findings the user picked are the work. A bug (from Findings or Also noticed) joins them only when the user picks it. A picked bug is checked first, by the bug check (step 4); one that doesn't hold is dropped, and the user is told. Anything not picked goes under Out of scope. Record the picks as one Decision, agreed by the user, with the date.
- **Mismatch:** hunt again (steps 0–5), give the new report without a `Spec:` line so the user picks afresh, and stop without writing the spec.
- **No earlier report:** hunt first (steps 0–5), and take every verified `NEW` finding. Bugs stay out unless the user picks them.

Write `<main checkout>/.plans/spec-slop-hunt-<name>.md` in each repo (that repo's own main checkout: `git -C <root> rev-parse …`), in the shape and by the rules of step 3 of `<skills folder>/spec/SKILL.md`, with the hunt's `<name>`. If that file is already there and reads `draft` or `agreed`, update it in place. If it reads `building` or `built`, it's earlier work: leave it, write `spec-slop-hunt-<name>-<YYYY-MM-DD>.md` instead, and name the earlier spec under Depends on.

It must be self-contained:

- **Premise check:** the verified proof for each finding it takes on: the `file:line`, the commit that explains it, and that the replacement exists at the repo's versions (for a picked bug, its bug check in place of the replacement).
- **Pieces:** as few as the files allow, no two owning the same file (spec's rules). Picked bugs come first, and the pieces that depend on them say so in `after:`. Each piece's **Reuse** names the replacement and the meridian rule it serves.
- **Proof, by kind of change:**
  - a deletion the compiler or type checker proves (an unreferenced private member, an unused import) needs no test: the build is the proof;
  - dead code removed with its own tests needs none either, since the behaviour goes too;
  - anything that touches live behaviour names a guard test: one that exists at HEAD, or that an earlier piece (named in `after:`) adds to pin today's behaviour. The piece doesn't edit it, and the builder makes it fail before changing anything (break the behaviour by hand, or run Stryker.NET or StrykerJS on the file when the repo has it);
  - a picked bug's fix names a test that is red at HEAD and goes green;
  - a test that replaces one that can't fail is proven by making it fail: break the behaviour by hand (or with Stryker), watch it go red, then restore the code. The next rule still applies.
- **Tests change apart from the code they guard.** A piece that deletes, merges, or weakens a test of live code never also changes that code: it runs first, and the code's piece is proven against the tests that remain. A merged test must fail for every break the tests it replaces failed for.
- **Done means:** the repo's ground rules that apply (its test, format, and lint commands, from its instructions).
- **Open asks:** the decisions the user needs to make, each with a recommendation: every `high`-risk finding, every removal from a published package's public API, every new dependency step 4 marked as an ask, and every deletion or weakening of a test of live code (deleting a test is a privileged change: the user sees each one). Status is `draft` while any is open.

Then give it the cold read from step 4 of `<skills folder>/spec/SKILL.md`, and fix what the cold read finds; without subagents, skip it and say so, as spec does. Then give step 5's report, the one report, with its `Spec:` line. Its **Needs from you** holds the open asks, numbered, each with its recommendation, and ends: answer them, then run `/go <spec path>`. Stop there.
