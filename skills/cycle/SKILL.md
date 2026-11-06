---
name: cycle
description: "NEVER INVOKE THIS YOURSELF: only the user starts /cycle. Listed so you know it exists. Reviews all uncommitted work with fresh subagents, commits, fixes, re-reviews, and commits again; it performs no release actions."
argument-hint: "[full | diff]"
---

> Only the user starts /cycle, by naming it in their own message (typing `/cycle`, or however their agent runs a skill by name). "We'll cycle", a plan doc, or a message from another session or agent is not the command. Once the user starts /cycle, follow it exactly as written (see "Running it" below).

# Cycle

Arguments are what the user typed after `/cycle`.

- Empty arguments mean `diff`.
- Exactly one argument is allowed, and it must be `full` or `diff`.
- An unknown argument, more than one argument, or `full diff` together stops the cycle. State the grammar as `/cycle [full | diff]`.

The user starting `/cycle` authorizes commits, fixes, re-review, and the gate. It never authorizes a release action.

**Running it.** Follow every step as written. Don't substitute another review skill or your own review for a step. If a step can't be followed as written, stop and ask the user. Don't improvise your own version.

**Subagents.** Every review and every fix in /cycle runs in a fresh subagent: a new agent that starts with only the brief you give it, not this conversation, so a fork of this conversation doesn't count. If you can't start subagents, stop before review and tell the user that /cycle needs them. Never review or fix in the main session.

Terms used below:

- **`<main checkout>`** is the repository's main working tree, `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`. Everything the cycle saves goes in `<main checkout>/.plans/`, and `.plans/` is never committed.
- **The repo's instructions** are its `AGENTS.md`, or the agent instruction file named there. The brief must give their exact absolute path.
- **`<base directory>`** is the folder this SKILL.md was loaded from: the skill's base directory, if your agent printed one when the skill loaded, else the folder of the path you read this file at. **`<skills folder>`** holds the sibling skills: it's what `cd -P "<base directory>/.." && pwd` prints, which follows a linked skill back to its repo. If you can't tell where this file was loaded from, ask the user for the path rather than guessing.
- **`<id8>`** is the last 8 characters of this session's id. Run `printenv` with your agent's own variable and take what it prints. If it prints nothing, use the id this conversation already states; if there is none, generate one once with `openssl rand -hex 4`. Name the cycle's folder, `<main checkout>/.plans/scratch/cycle-<id8>/`, in your first message, so it survives a compaction.

## 1. Scope

- Run `git status --short` from the repo root. The scope is **every** uncommitted change, including other sessions' work. Never narrow it to "mine".
- Leave out anything the repo's instructions list as never-commit, plus `.plans/`. Mention untracked files that look accidental.
- If you can list other agent sessions working in this tree, do. If one is mid-edit on files in scope and you can message it, message it once ("cycling the tree; are you mid-edit on X?") and wait for the reply or 2 minutes. Then carry on and note it in the report.
- Group the files into **vertical slices** (feature or module folders, front and back end of one feature together).
- Find the intent only from `<main checkout>/.plans/spec.md`, and use it only when its status is `building`. If that file is absent, unreadable, or has any other status, review without an intent and never fall back to another `.plans/` document or a waypoint. When the active spec exists, reviewers check it against its Intent, Decisions, Pieces, Done means, and Out of scope.
- Apply the requested read mode to every slice:
  - **`diff`:** read each changed tracked file's diff with its surrounding code, except read the whole file when it changes a contract or endpoint, a schema or migration, an INVARIANTS rule, or a domain or application rule (validation, a decider, a use case, or a server rule the UI reads). When unsure, use a full read.
  - **`full`:** read every changed tracked file in full.
  - In both modes, read untracked files in full. For a deleted tracked file, read the deletion and search the tree for surviving references.
- With `diff`, list each slice as `diff` or `full` before reviewing.

## 2. Review

- Load the `meridian` skill. If UI files changed, also load the repo's UI skill, if its instructions name one.
- Always start these reviewer subagents in parallel:
  - **one per slice**: correctness and KISS;
  - **one backend meridian-compliance pass** over all backend files in scope;
  - **one frontend meridian-compliance pass** over all frontend files in scope.
- Every reviewer brief must be self-contained and contain these exact facts, with placeholders resolved:
  - Main checkout: `<absolute main checkout>`.
  - Scope or worktree: the reviewer's exact absolute file paths, and for `diff`, each path's `diff` or `full` mark.
  - Owned and forbidden files: the reviewer owns only its absolute report path and may edit no other file.
  - Review mode: `diff` or `full`, with the deleted-file and untracked-file rules above.
  - Active spec: the absolute path `<main checkout>/.plans/spec.md` only when its status is `building`; otherwise state that there is no intent.
  - Meridian files and rules: the exact absolute files named below, plus the rule that a Meridian Law outranks any spec or plan and a violation is a `blocker` or `fix`.
  - Repo instructions: the exact absolute path to the repository's instructions.
  - Report path: the reviewer's absolute report path.
  - Save protocol: save the full report with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), and if saving is refused, reply with the whole report.
  - Reply protocol: reply with only the absolute report path and the count of findings by severity.
- Tell each reviewer which meridian files to read (`SKILL.md` plus these under `references/`), not the whole skill:
  - slice reviewer: `coding-philosophy.md`, `invariants-and-concurrency.md`;
  - backend pass: `backend-pa-vsa.md`, `invariants-and-concurrency.md`, `testing-philosophy.md`, and `rivet.md` if contracts or endpoints changed;
  - frontend pass: `frontend-pa-vsa.md`, `frontend-ui.md`, plus the repo's UI skill.
- Every reviewer brief must also contain these review rules:
  - Read the named meridian files, the UI skill if named, and the repo's instructions first.
  - Read every file in the assigned mode, plus the callers and tests the change touches. Open more of a tracked file only where a `diff` hunk depends on code outside what's shown.
  - If there is a building active spec, check the work against it: every requirement is implemented, and nothing outside its scope changed.
  - Look for bugs and regressions; broken invariants or races; changed behaviour with no test; house-rule violations; hand-rolled machinery the platform or a library already provides; WET code; over-engineering and ceremony; compat layers or shims; dead code; UI drift from existing components and patterns; copy that's unclear or full of jargon; and gaps excused in a doc, `Accepts`, changelog, or comment instead of fixed. A gap with a doc page is still a gap and is judged as a `fix`.
  - Flag each of these as a `blocker` when introduced: a check that can't fail, valid ordinary behaviour refused, dropped, or excluded to make something pass, and new machinery that names no maintained tool it checked first.
  - For every changed condition, entry, or flag, read every place it's used, and say what the change switches on or off there. A line is judged by what it does, not by its comment or the builder's note.
  - Flag only what affects correctness, a meridian law, or the intent as `blocker` or `fix`. Style preferences are `nit` at most, and harmless code needs no finding at all.
  - Tag every finding's origin: `introduced` when this diff caused it or the building spec promised it and it isn't done; `existing` when it was already there and lies outside the intent. Mark an `existing` finding `trivial` when its fix is mechanical, a few lines with no design call.
  - Run the repo's doctrine checker or linter for the reviewer's files only, when the repo's instructions name one. Don't run tests, typechecks, or the gate.
  - Report each finding as `file:line`, the problem, the concrete fix, the severity (`blocker` / `fix` / `nit` / `decision`), and the origin (`introduced` / `existing`). End with "Files read: N/N" and list them. With `diff`, mark each file `whole` or `diff`.
  - Read only, except for the report file.
- Name each reviewer's report file in its brief: `<main checkout>/.plans/scratch/cycle-<id8>/r<round>-<reviewer>.md` (absolute path, `<reviewer>` the slice or pass name). Read findings from the files, not from the replies. If a reviewer replies with its report instead of a path, save the reply to its named file verbatim before doing anything else, and tell the user in your next message which reviewer couldn't save its own. If a reviewer's reply never reaches you, read the file before deciding to rerun the reviewer: a complete one ends with "Files read: N/N".
- After every reviewer has reported, check the findings yourself. Drop false positives, merge duplicates, and check every `blocker` claim against the code.

## 3. Coverage and gates

- Print `Reviewed: <files read by any reviewer> / <files in scope>`. If a file was missed, send it to a reviewer subagent now rather than reporting the gap.
- Run the **targeted checks**: the tests for the classes and specs in scope, plus typecheck and lint for the changed files, as the repo's instructions describe. Not the full gate; that runs once, in step 6.

## 4. Commit first

- Commit unless a targeted check is red or a finding is a `blocker` (broken build, data loss, security hole, or one of the three checks in step 2 when `introduced`). If one is, brief a fixer subagent with the failing check or blocker (as in step 5), rerun only what failed, then run round 0's mutation once (step 6) after every round 0 fix and check passes, and commit. Those fixes go into this first commit; list them (`file:line` and the finding each fixes) in round 2's re-review brief so the re-reviewer checks them too. The re-reviewer reads them at the listed `file:line`, not in the round's diff. If step 5 leaves no fix diff, review them on their own as a small fix diff (step 6) before the gate.
- Stage **explicit paths only**. Never `-A`, `-u`, or `.`. Re-check `git status` right before staging, because peers edit in between.
- Never `git reset --hard`, `git checkout -- .`, or `git clean`, and never stash someone else's work.
- Use one commit, unless the tree clearly holds unrelated features that read better split.
- Write the message in plain English, the way the repo's recent `git log` reads, saying what changed for the user.

## 5. Fix

- The main session writes no fixes. Brief one fixer subagent per slice with its findings.
- Every fixer brief must be self-contained and contain these exact facts, with placeholders resolved:
  - Main checkout: `<absolute main checkout>`.
  - Worktree and scope: the exact worktree and absolute file paths the fixer may change.
  - Owned and forbidden files: the owned paths above; every other path is forbidden.
  - Fix mode: fix the listed findings in the owned paths, then stop. Never review unrelated work or expand scope.
  - Active spec: the absolute path `<main checkout>/.plans/spec.md` only when its status is `building`; otherwise state that there is no intent.
  - Findings: each `file:line`, the problem, and the concrete settled fix. A finding marked as a design call, or one that says "check whether", "trace", or "make sure", is settled before the fixer starts.
  - Meridian files and rules: the exact absolute files named below, plus the backend, frontend, or UI reference that owns the changed boundary. State that a Meridian Law outranks any spec or plan, a documented gap is still a gap, fixes target the root cause with no shim, and a new or changed check must be able to fail.
  - Repo instructions: the exact absolute path to the repository's instructions.
  - Report path: the fixer's absolute report path.
  - Save protocol: save the full report with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), and if saving is refused, reply with the whole report.
  - Reply protocol: reply with only the absolute report path and a one-line list of what changed.
  - Test-only fix items: for each, record the guarded source files and the precise behaviour it promises to guard, identified by symbol or source region, in a distinct entry in the brief. Record it even when the brief also contains source fixes.
  - Fix rules: fix every introduced `fix` and every trivial `existing` finding. Fix the defect, not its description. Fix a `nit` only when the fix is mechanical. Do not park a trivial gap, and do not resolve a finding by rewording a doc.
- A brief may carry several findings only when each is already settled to a `file:line` and a concrete fix. A finding whose fix spans more than its own `file:line` (several call sites, or the sweep through the places the change feeds) gets a brief of its own, after the others. A fix that changes what the building active spec says gets an addendum first.
- Every fix brief, the blocker and gate fixes included, gets a fresh critic before the next check and before the round's re-review, run as `/go` step 4 says with:
  - the prompt `<skills folder>/go/references/critic.md`;
  - files in `<main checkout>/.plans/scratch/cycle-<id8>/`, with `<name>` = `fix-<slice>-<round>-<n>` (round `0` for the blocker fixes, `gate` for the gate fixer, and `<n>` counting that slice's briefs in that round), and the ready critic worktree at `<main checkout>/.plans/scratch/cycle-<id8>/wt-<name>`;
  - the slice's files as its owned paths, and the slice's building active spec, or else the brief's findings, as its spec;
  - a before snapshot for every brief, with no setup or checks. The round's first brief uses `<before>` = `<main checkout>/.plans/scratch/cycle-<id8>/wt-pre-round-<round>`; each later brief uses `<before>` = `<main checkout>/.plans/scratch/cycle-<id8>/wt-pre-<name>`. Snapshot the whole uncommitted tree with `/go` step 4's output exclusions and these three commands:
    - `git worktree add --detach <before> HEAD`
    - `git diff HEAD --binary | git -C <before> apply --allow-empty`
    - `git ls-files -z --others -- . ':(exclude).plans/' <output exclusions> | tar --null -T - -cf - | tar -xf - -C <before>`
  - after the builder finishes and its critic worktree is ready, `<main checkout>/.plans/scratch/cycle-<id8>/diff-<name>.patch`: for each slice file, append the output of `git diff --no-index -U3 --binary -- <before-file> <critic-file>` between the before snapshot and critic worktree, using `/dev/null` when either side is absent and treating exit 1 as differences. Pass this patch to the critic as its patch input. Extra is limited to lines this fix changed; Missing and Misunderstood retain their existing scope;
  - removal of each later brief's before snapshot after producing its patch. Keep the round snapshot until that round's mutation attribution is complete. Remove worktrees when their use ends, and report any left behind.
  - a self-contained brief with the main checkout, critic worktree, owned and forbidden paths, patch path, building active spec only when applicable, exact repo instructions, report path, heredoc save protocol, and path-only reply protocol.
- No fixer starts on a question. Trace a question yourself, or with a read-only fact-gatherer, through every place the changed code feeds, with `file:line`s, then brief the settled fix. A fixer is never where a question gets answered. A fixer showing one of `/go` step 4's signs that a brief isn't working is handled as that step says. A finding that goes to the user for a stronger model stays unfixed and is listed under Needs from you. The round commits without it, unless it's a `blocker`, in which case stop and report.
- Fix every `introduced` `fix` finding that doesn't need the user.
- Trivial gaps are never parked. An `existing` finding whose fix is trivial (mechanical, a few lines, no design call) is fixed in this step like an `introduced` one.
- When one of step 2's three checks is `existing`, the gap rule decides: trivial, fixed in this step; non-trivial, parked, and it opens the report as its own numbered finding, under the Lead-with rule — in both slots, by design: the finding is the news, the park is the action.
- A non-trivial `existing` finding is new work, not this cycle's: don't fix it in passing, and don't hand it to the user as a `decision`. Park it: tell the user and list it under **Parked** in your report, never in an `Accepts`, comment, or doc, judged as AGENTS.md says (still holds, fold or leave, why). The user decides which to take on. A `blocker` is fixed whatever its origin (the three checks above excepted).
- Fix the defect, not its description. When a finding is that a doc overstates the code, make the code do what the doc says wherever that's possible, including in a library the company owns (for example plumb or rivet). Rewording the doc to describe a gap accurately does not resolve it. A gap that can't be fixed in this cycle is parked when it's non-trivial and outside the intent, or reported as a finding when the platform can't do it at all; never a `decision`, and never a doc.
- Collect the `decision` findings into a numbered list, each with your recommendation, for the report. Don't block on them.

## 6. Re-review and commit again

- Every round is its own commit, so each round's review sees exactly that round's fixes. Never let one round's fixes sit on top of an earlier round's uncommitted fixes: commit each round before the next round's fixes start, or the layers can't be separated afterwards. (A small fix diff is reviewed while uncommitted, and its re-review's fixes go into that same commit.)
- A re-review checks only the fix diff for bugs, regressions, and broken laws that the fixes introduced. It is not a fresh hunt over code an earlier round already reviewed, and its nits are dropped.
- A re-review always reads diffs, in every mode and whatever a slice's mark.
  - Reviewers read the round's fix diff: `git diff -U30 HEAD -- <file>` while the fixes are uncommitted (small fix diff), or `git diff -U30 <previous round's commit>..HEAD -- <file>` once they're committed (large fix diff). They open more of a file, or a caller, only where a hunk depends on it.
  - Files new in the round are read in full.
  - Full reads are only for a round's first review.
- Count the fix diff once, when choosing the re-review path: `git diff HEAD --numstat` over the scope, plus `wc -l` for untracked files, excluding generated files, lockfiles, and contract output. State the count of changed hand-written lines before choosing the path.
- **Small fix diff** (under 400 changed lines of hand-written code): review it before committing with one fresh reviewer subagent, briefed as in step 2 with its own report file. A fixer subagent fixes what it finds (as in step 5). Run the targeted checks for what the fixes touched, then the mutation run, and commit with explicit paths, message `Review fixes: <plain-English summary>`. Done.
- **Large fix diff** (over that, or a new slice or schema or contract change): the fixes are new work, so they go round the cycle like the original:
  1. Run the targeted checks for what the fixes touched, then the mutation run, then commit them (`Review fixes: …`), commit first as in step 4.
  2. Review that commit's diff with steps 2–3: slices, fanned-out reviewers, coverage.
  3. Fix as in step 5, then judge the new fix diff by size again.
- Keep going round until a round's fix diff is small. After **three rounds**, stop and report what's left rather than looping.
- **Mutation, once per round, round 0 and `gate` included,** last before the round's commit and after that round's re-review fixes and targeted checks: make `<main checkout>/.plans/scratch/cycle-<id8>/wt-mutation-<round>` and run `/go` step 5's mutation command contract over the source files that round's fixes changed, plus every existing source file recorded for a test-only fix item in step 5, even when the test item's slice does not own that source.
  - Before mutation, resolve each test-only fix item's promised guarded regions to current-file line ranges in the ready mutation worktree. Include them even when the source is unchanged.
  - For each mutation file, run `git diff --no-index -U0 -- <before-file> <mutation-file>` between its round-snapshot file and mutation file (exit 1 means differences), using `/dev/null` when the before file is absent. This round's current `+` ranges are its changed-source lines. When the repo command accepts ranges, supply the union of those changed-source ranges and the promised guarded ranges.
  - A Survived or NoCoverage mutant in a promised guarded region is an `introduced` finding for every test-only fix item that promised that region, routed to each test item's owner even when its slice does not own the source file. Changed-source attribution is additive: a survivor inside a current-file `+` range is also `introduced` for the source-owning fix item. Combine all of each item's survivor bullets into one failure from this mutation result, even for overlapping regions or several mutants; charge that item only once under `/go` step 4's retry cap.
  - A survivor outside both the promised guarded regions and the changed-source ranges is `existing`. Route each finding through step 5's rules for its origin, retaining the test-item owners above. A survivor sent to a fixer gets a critic and ordinary targeted checks, never a second mutation run. After survivor attribution, remove the round snapshot and mutation worktree.
- **Full gate, once.** After the last round, run the repo's gate (named in its instructions, e.g. `task check`; if none, its format check, lint, typecheck, and fast tests). If it's red, brief a fixer subagent with the failing check (as in step 5), rerun **only the failing tests**, then run the `gate` round's mutation once, and commit `Review fixes: …`. Never rerun the whole gate to confirm a fix. If they're still red after one fix, or the critic FAILs that fix, stop and report what's failing rather than looping.
- When the active spec is `building` and all of its Pieces are done, set `<main checkout>/.plans/spec.md` to `built (<final commit hash>)`. If work remains, leave it `building` and say what's left in the report. If there is no building active spec, don't invent one and don't change a spec.
- Perform no release action. A release action happens only when the user requests it separately after the cycle.

## 7. Report

Save the report to `<main checkout>/.plans/scratch/cycle-<id8>/report.md`, with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), before giving it. The report is a saved record of the cycle.

```
**TLDR:** <plain English>
**Findings:** 1. <finding that changes the picture, stated in full>, or none
**Commits:** <hash subject> (+ fixes <hash>, one per round)
**Reviewed:** <N>/<N> files · reviewers: <count> · rounds: <n> (with `diff`: · full slices: <names>)
**Fixed:** <one line per notable fix>
**Critic says:** <each fix brief's verdict, its judgement findings, and its PARTIAL gaps; leave the line out when no fix brief ran>
**Not checked:** <PARTIAL gaps, `mutation: not run (…)`, and any other unrun check, with its cause>
**Mutation:** <each round's exit code, mutant count, and survivors, or `mutation: not run (…)`>
**Dropped nits:** <one line, or none>
**Parked:** 1. <non-trivial `existing` gap> (rec: fold now | leave, why), or none
**Worktrees left behind:** <paths you couldn't remove; leave the line out when none>
**Reports saved by me:** <reviewers and critics that couldn't save their own report; leave the line out when none>
**Needs from you:** 1. … (rec: …), or none. Release actions happen only when the user requests them separately.
```

**Needs from you** is as the repo's instructions define it.
