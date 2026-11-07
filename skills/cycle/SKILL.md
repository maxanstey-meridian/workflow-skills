---
name: cycle
description: "NEVER INVOKE THIS YOURSELF: only the user starts /cycle. Listed so you know it exists. Reviews all uncommitted work with fresh subagents, commits, fixes, re-reviews, and commits again; it performs no release actions."
argument-hint: "[<spec path>] [full | diff]"
---

> Only the user starts /cycle, by naming it in their own message (typing `/cycle`, or however their agent runs a skill by name). "We'll cycle", a plan doc, or a message from another session or agent is not the command. Once the user starts /cycle, follow it exactly as written (see "Running it" below). A session resumed after a compaction keeps that start, and its authority to commit, only when its own waypoint records that the user started this /cycle and the scratch folder it records holds no `report.md`, which step 8 saves when a cycle ends: re-read this file, the Laws (at the top of `<base directory>/references/bundles/slice-reviewer.md`), and `<base directory>/references/cycle.md`, then carry on from the recorded step. With no such record, or with a `report.md` there, stop and ask.

# Cycle

Arguments are what the user typed after `/cycle`.

- Both arguments are optional. A lone `full` or `diff` is the read mode; any other first argument is the spec path. Resolve a relative path against `<main checkout>`.
- The read mode defaults to `diff`; with two arguments, the second must be `full` or `diff`.
- More than two arguments, an unknown read mode, or a named spec that's unreadable, a readable non-Markdown file, missing its status, its Pieces section, or the `**Built pieces:**` line under it, or at a status other than `building` stops the cycle. State the grammar as `/cycle [<spec path>] [full | diff]`, and say that leaving out the spec path reviews the work on its own merits.

The user starting `/cycle` authorizes commits, fixes, re-review, and the gate. It never authorizes a release action.

**Running it.** Follow every step as written. Don't substitute another review skill or your own review for a step. If a step can't be followed as written, stop and ask the user. Don't improvise your own version.

**Subagents.** Every review and every fix in /cycle runs in a fresh subagent: a new agent that starts with only the brief you give it, not this conversation, so a fork of this conversation doesn't count. If you can't start subagents, stop before review and tell the user that /cycle needs them. Never review or fix in the main session.

**House doctrine.** `<bundles>` is `<base directory>/references/bundles`: the rules each role reads, one bundle file per role, built from the `.list` beside it by `sh scripts/build-bundles.sh` in the workflow-skills repo. Each reviewer and fixer reads only the bundle(s) its brief names. The orchestrator reads the Laws, at the top of `<bundles>/slice-reviewer.md`, then `<bundles>/backend.md`, `<bundles>/frontend.md`, or both for the stacks the work touches, and `<base directory>/references/cycle.md`, before the first review or fix brief: that file owns the cold read, critic procedure, worktree snapshot procedure, retry rules, and mutation contract. A rule a bundle cites by its library path, such as `invariants/concurrency-review.md`, is in the bundle under its `<!-- rule: <path> -->` line. Step 7's auditor reads `<bundles>/auditor.md`.

**The ledger.** You don't write the report: step 7's auditor does, from the evidence the cycle leaves. Your part of that evidence is `<main checkout>/.plans/scratch/cycle-<id8>/ledger.md`, which you append to as you go, one line per event, `- <kind>: <facts> · evidence: <path, file:line, or runs/ log>`, with no summary and no recommendation. The kinds:

- `run`: every command you run yourself (a rerun, a targeted check, a Done-means check, a mutation run, setup, or the gate), with its output, working folder, and exit code saved to `cycle-<id8>/runs/<n>.log`;
- `dropped`: a finding you dropped, quoted with its report file, and why, with the `file:line` that shows it;
- `merged`: the findings you merged, by report file and entry;
- `commit`: each commit's hash, its round, and the findings it fixes;
- `call`: a design call you made, by its spec Decision number or the brief whose `Call` line holds it;
- `unbuilt`: an item left unbuilt, with the sign or FAIL that stopped it;
- `blocked`: a setup failure that is BLOCKED, with its log;
- `setup-inferred`: setup the repo's instructions don't name, and what you ran instead;
- `peer-red`: a red from a file that entered the tree after step 1's scope;
- `peer-left-out`: a file left out because a peer session is mid-edit on it;
- `worktree-left`: a worktree you couldn't remove.

The ledger is the only file of yours the auditor reads.

Terms used below:

- **AGENTS.md** is the workflow-skills shared rules file your agent loads as its rules, not the repo's own AGENTS.md.
- **`<main checkout>`** is the repository's main working tree, `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`. Everything the cycle saves goes in `<main checkout>/.plans/`, and `.plans/` is never committed.
- **The named spec** is the spec path the user gave, at its resolved absolute path. It must be readable Markdown with a `**Status:**` value, a `## Pieces` section, and the `**Built pieces:**` line under it. With no spec path there is no named spec: briefs say `Active spec: none`, every changed file is reviewed on its own merits, the critic checks a fix against its brief, and no spec changes.
- **The repo's instructions** are as AGENTS.md 'Routines' defines them. The brief must give their exact absolute path.
- **`<base directory>`** is the folder this SKILL.md was loaded from: the skill's base directory, if your agent printed one when the skill loaded, else the folder of the path you read this file at. If you can't tell where this file was loaded from, ask the user for the path rather than guessing.
- **`<id8>`** is the last 8 characters of this session's id. Run `printenv` with your agent's own variable and take what it prints. If it prints nothing, use the id this conversation already states; if there is none, generate one once with `openssl rand -hex 4`. The cycle's folder is `<main checkout>/.plans/scratch/cycle-<id8>/`. When you generated the id, name the folder in your first message, so it survives a compaction. Remove any `report.md`, `ledger.md`, `runs/`, and `audit-*.md` left there by an earlier cycle in this session.

## 1. Scope

- Run `git status --short` from the repo root. The scope is **every** uncommitted change, including other sessions' work. Never narrow it to "mine".
- Leave out anything the repo's instructions list as never-commit, plus `.plans/`. Mention untracked files that look accidental.
- If you can list other agent sessions working in this tree, do. If one is mid-edit on files in scope, leave those files out of this cycle, each as a `peer-left-out` ledger entry.
- Group the files into **vertical slices** (feature or module folders, front and back end of one feature together).
- Find the intent only from the named spec, if there is one. Never fall back to another `.plans/` document or a waypoint. Reviewers check it against its Intent, Decisions, Pieces, Addenda, Done means, and Out of scope.
- Check a changed file against the named spec only when that file is named in the named spec's Pieces' or Addenda's `owns` lists. Include any change in such a file that no Piece or Addendum accounts for as outside the spec's intent. Review a changed file outside those `owns` lists for correctness and doctrine on its own merits.
- With a named spec, list every Piece and Addendum the spec's `**Built pieces:**` line does not name. Give each to a slice reviewer, with its owned paths in that reviewer's scope, read in full. A requirement it hasn't built is an `introduced` finding.
- Apply the requested read mode to every slice:
  - **`diff`:** read each changed tracked file's diff with its surrounding code, except read the whole file when it changes a contract or endpoint, a schema or migration, an INVARIANTS rule, or a domain or application rule (validation, a decider, a use case, or a server rule the UI reads). When unsure, use a full read.
  - **`full`:** read every changed tracked file in full.
  - In both modes, read untracked files in full. For a deleted tracked file, read the deletion and search the tree for surviving references.

## 2. Review

- If UI files changed, also load the repo's UI skill, if its instructions name one.
- Start these reviewer subagents in parallel:
  - **one per slice**: correctness and KISS;
  - **one backend house-doctrine-compliance pass** over all backend files in scope, when there are any;
  - **one frontend house-doctrine-compliance pass** over all frontend files in scope, when there are any.
- Every reviewer brief must be self-contained and contain these exact facts, with placeholders resolved:
  - Main checkout: `<absolute main checkout>`.
  - Scope or worktree: the reviewer's exact absolute file paths, and for `diff`, each path's `diff` or `full` mark.
  - Owned and forbidden files: the reviewer owns only its absolute report path and may edit no other file.
  - Review mode: `diff` or `full`, with the deleted-file and untracked-file rules above.
  - Active spec: the absolute path to the named spec, or `none`.
  - Doctrine: the exact absolute path of the reviewer's bundle below, to read in full before anything else, plus the rule that a house Law outranks any spec or plan and a violation is a `blocker` or `fix`. A rule the bundle cites by its library path, such as `invariants/concurrency-review.md`, is in the bundle under its `<!-- rule: <path> -->` line.
  - Repo instructions: the exact absolute path to the repository's instructions.
  - Report path: the reviewer's absolute report path.
  - Save protocol: save the full report with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), and if saving is refused, reply with the whole report.
  - Reply protocol: reply with only the absolute report path.
- Tell each reviewer which bundle to read, in full:
  - slice reviewer: `<bundles>/slice-reviewer.md`;
  - backend pass: `<bundles>/backend.md`;
  - frontend pass: `<bundles>/frontend.md`, and the repo's UI skill.
- Every reviewer brief must also contain these review rules:
  - Read the named bundle, the UI skill if named, and the repo's instructions first.
  - Read every file in the assigned mode, plus the callers and tests the change touches. Open more of a tracked file only where a `diff` hunk depends on code outside what's shown.
  - For a file in the named spec's Pieces' or Addenda's `owns` lists, check the work against the named spec: every requirement that item implements is implemented, nothing its Out of scope excludes was built, and any change in that file that no Piece or Addendum accounts for is outside its intent. For a file outside those `owns` lists, review only correctness and doctrine on its own merits.
  - Look for bugs and regressions; broken invariants or races; changed behaviour with no test; house-rule violations; hand-rolled machinery the platform or a library already provides; WET code; over-engineering and ceremony; compat layers or shims; dead code; UI drift from existing components and patterns; copy that's unclear or full of jargon; and gaps excused in a doc, `Accepts`, changelog, or comment instead of fixed. A gap with a doc page is still a gap and is judged as a `fix`.
  - Flag each of these as a `blocker` when introduced: a check that can't fail, valid ordinary behaviour refused, dropped, or excluded to make something pass, and new machinery doing a job a maintained tool already provides.
  - For every changed condition, entry, or flag, read every place it's used, and say what the change switches on or off there. A line is judged by what it does, not by its comment or the builder's note.
  - Flag only what affects correctness, a house law, or the intent as `blocker` or `fix`. Style preferences are `nit` at most, and harmless code needs no finding at all.
  - Tag every finding's origin: `introduced` when this diff caused it or the named spec promised it and it isn't done; `existing` when it was already there and lies outside the intent. Mark an `existing` finding `trivial` when its fix is mechanical, a few lines with no design call.
  - Run the repo's doctrine checker or linter for the reviewer's files only, when the repo's instructions name one. Don't run tests, typechecks, or the gate.
  - Report each finding as `file:line`, the problem, its harm (what goes wrong, and the command or `file:line` that shows it; a `nit` or `decision` has none), the concrete fix, the severity (`blocker` / `fix` / `nit` / `decision`), and the origin (`introduced` / `existing`). End with a `Files read:` line listing every file you read in full. With `diff`, mark each file `full` or `diff`.
  - Read only, except for the report file.
- Name each reviewer's report file in its brief: `<main checkout>/.plans/scratch/cycle-<id8>/r<round>-<reviewer>.md` (absolute path, `<reviewer>` the slice or pass name). Read findings from the files, not from the replies. If a reviewer replies with its report instead of a path, save the reply to its named file verbatim before doing anything else. If a reviewer's reply never reaches you, read the file before deciding to rerun the reviewer: a complete one ends with its Files read line.
- After every reviewer has reported, check the findings yourself. Drop false positives, merge duplicates, and check every `blocker` claim against the code. Each drop is a `dropped` ledger entry and each merge a `merged` one.

## 3. Coverage and gates

- Compare the union of the reviewers' Files read lines with the files in scope. If a file was missed, send it to a reviewer subagent now rather than reporting the gap.
- Run the **targeted checks**: the tests for the classes and specs in scope, plus typecheck and lint for the changed files, as the repo's instructions describe. Not the full gate; that runs once, in step 6.
- With a named spec, also run every Done-means check it lists. Run yourself any that no subagent could run. One that nobody here can run goes to Needs from you, and the work isn't done until it's run or the user waives it. Never drop one silently. A red one blocks the commit as a red targeted check does.

## 4. Commit first

- Commit unless a targeted check is red or a finding is a `blocker` (broken build, data loss, security hole, or one of the three checks in step 2 when `introduced`). If one is, brief a fixer subagent with the failing check or blocker (as in step 5), rerun only what failed, then run round 0's mutation once (step 6) after every round 0 fix and check passes, and commit. Those fixes go into this first commit; list them (`file:line` and the finding each fixes) in round 2's re-review brief so the re-reviewer checks them too. The re-reviewer reads them at the listed `file:line`, not in the round's diff. If step 5 leaves no fix diff, review them on their own as a small fix diff (step 6) before the gate.
- Stage **explicit paths only**. Never `-A`, `-u`, or `.`. Re-check `git status` right before staging, because peers edit in between.
- Never `git reset --hard`, `git checkout -- .`, or `git clean`, and never stash someone else's work.
- Use one commit, unless the tree clearly holds unrelated features that read better split.
- Write the message as `tools/commits.md` says. It is in `<bundles>/backend.md` and `<bundles>/frontend.md`; when the work touches neither stack, read it in `backend.md`, as a fixer does. Never copy the shape of the repo's recent `git log`.

## 5. Fix

- The main session writes no fixes. Brief one fixer subagent per slice with its findings.
- Write each fix brief to `<main checkout>/.plans/scratch/cycle-<id8>/brief-<name>.md`, with `<name>` as named below.
- Every fixer brief must be self-contained and contain these exact facts, with placeholders resolved:
  - Main checkout: `<absolute main checkout>`.
  - Worktree and scope: the exact worktree and absolute file paths the fixer may change.
  - Owned and forbidden files: the owned paths above; every other path is forbidden.
  - Fix mode: fix the listed findings in the owned paths, then stop. Never review unrelated work or expand scope.
  - Active spec: the absolute path to the named spec, or `none`.
  - Findings: each finding quoted word for word from a saved file, naming the file: a reviewer's or zoom-out report entry (its `file:line`, problem, harm, concrete fix, severity, and origin); on a re-brief, the critic report's FAIL bullets, after the original finding quoted again; or, for a red check or a mutation survivor, the command and its output, which you save to `<main checkout>/.plans/scratch/cycle-<id8>/source-<name>.md` before writing the brief, followed, after the quote and not part of it, by your mechanical fix as `Fix:`, or by a `Call` line when the fix is a call of yours. Never reword a quote. When the fix is a call you made, as `Cold read` in `<base directory>/references/cycle.md` defines one, add it after the quote as a line that opens `Call (build this, not any fix quoted above):`, never edited into the quote. A finding marked as a design call, or one that says "check whether", "trace", or "make sure", is settled before the fixer starts.
  - Doctrine: the exact absolute path of the fixer's bundle, `<bundles>/backend.md` or `<bundles>/frontend.md` by the stack the fix touches, or both when it touches both (work in neither stack, such as scripts, docs, or configuration, counts as backend), to read in full before anything else. State that a house Law outranks any spec or plan, a documented gap is still a gap, fixes target the root cause with no shim, and a new or changed check must be able to fail. A rule the bundle cites by its library path, such as `invariants/concurrency-review.md`, is in the bundle under its `<!-- rule: <path> -->` line.
  - Repo instructions: the exact absolute path to the repository's instructions.
  - Hard stop: if the fixer finds an open question, an undecided premise, or a design call the brief did not make, it stops that finding, keeps its edits, and reports what the code admits.
  - Commands: every exact command the fixer may run, from the worktree root, and only the targeted checks for its owned files. When the repo names no command a check needs, the brief says so and the fixer reports that check as not run.
  - Report content: facts only: the `file:line` evidence for each claim, and what it could not check. No recommendation, option, confidence, or ask.
  - Report path: the fixer's absolute report path, `<main checkout>/.plans/scratch/cycle-<id8>/report-<name>.md`.
  - Save protocol: save the full report with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), and if saving is refused, reply with the whole report.
  - Reply protocol: reply with only the absolute report path.
  - Test-only fix items: for each, record the guarded source files and the precise behaviour it promises to guard, identified by symbol or source region, in a distinct entry in the brief. Record it even when the brief also contains source fixes.
  - Fix rules: fix every introduced `fix` and every trivial `existing` finding. Fix the defect, not its description. Fix a `nit` only when the fix is mechanical. Do not park a trivial gap, and do not resolve a finding by rewording a doc.
- A brief may carry several findings only when each is already settled to a `file:line` and a concrete fix. A finding whose fix spans more than its own `file:line` (several call sites, or the sweep through the places the change feeds) gets a brief of its own, after the others. A fix that changes what the named spec says gets an addendum first.
- Every fix brief, the blocker and gate fixes included, gets a fresh critic before the next check and before the round's re-review, run as `Critic procedure`, `Worktree snapshots`, and `Retry rules` in `<base directory>/references/cycle.md` say with:
  - the critic bundle for each stack the fix brief's bundle(s) name, `<bundles>/backend-critic.md`, `<bundles>/frontend-critic.md`, or both, as the critic brief's doctrine source;
  - files in `<main checkout>/.plans/scratch/cycle-<id8>/`, with `<name>` = `fix-<slice>-<round>-<n>` (round `0` for the blocker fixes, `gate` for the gate fixer, `audit` for step 7's fixes, and `<n>` counting that slice's briefs in that round), and the ready critic worktree at `<main checkout>/.plans/scratch/cycle-<id8>/wt-<name>`;
  - the slice's files as its owned paths, and the named spec's absolute path, or `none`, as its spec;
  - the before snapshot, the Fix patch, and their removal, as `Worktree snapshots` says.
- No fixer starts on a question. Trace a question yourself, or with a read-only fact-gatherer, through every place the changed code feeds, with `file:line`s, then brief the settled fix. A brief whose fix is a call you made gets a cold read before its fixer starts, as `Cold read` in `<base directory>/references/cycle.md` says. A fixer is never where a question gets answered. A fixer showing one of `Retry rules`' signs that a brief isn't working is handled as that section says. An item left unbuilt under `Retry rules` stays unfixed, as an `unbuilt` ledger entry. The round commits without it, unless it's a `blocker`, in which case stop and go to step 7.
- Fix every `introduced` `fix` finding that doesn't need the user, and every `existing` finding whose fix is trivial (mechanical, a few lines, no design call): trivial gaps are never parked.
- When one of step 2's three checks is `existing`, the gap rule decides: trivial, fixed in this step; non-trivial, parked, and step 7's template has it open the report's Findings as well as Parked, by design: the finding is the news, the park is the action.
- A non-trivial `existing` finding is new work, not this cycle's: don't fix it in passing, and don't hand it to the user as a `decision`. Park it: leave it unfixed, and never write it into an `Accepts`, comment, or doc. Step 7's audit judges it and lists it under **Parked**. The user decides which to take on. A `blocker` is fixed whatever its origin (the three checks above excepted).
- Fix the defect, not its description. When a finding is that a doc overstates the code, make the code do what the doc says wherever that's possible, including in a library the company owns (for example plumb or rivet). Rewording the doc to describe a gap accurately does not resolve it. A gap that can't be fixed in this cycle is parked when it's non-trivial and outside the intent, or reported as a finding when the platform can't do it at all; never a `decision`, and never a doc.
- Leave the `decision` findings for step 7's audit, which recommends an answer to each. Don't block on them.

## 6. Re-review and commit again

- Every round is its own commit, so each round's review sees exactly that round's fixes. Never let one round's fixes sit on top of an earlier round's uncommitted fixes: commit each round before the next round's fixes start, or the layers can't be separated afterwards. (A small fix diff is reviewed while uncommitted, and its re-review's fixes go into that same commit.)
- A re-review checks only the fix diff for bugs, regressions, and broken laws that the fixes introduced. It is not a fresh hunt over code an earlier round already reviewed, and its nits are dropped.
- A re-review always reads diffs, in every mode and whatever a file's mark.
  - Reviewers read the round's fix diff: `git diff -U30 HEAD -- <file>` while the fixes are uncommitted (small fix diff), or `git diff -U30 <previous round's commit>..HEAD -- <file>` once they're committed (large fix diff). They open more of a file, or a caller, only where a hunk depends on it.
  - Files new in the round are read in full.
  - Full reads are only for a round's first review.
- Count the fix diff once, when choosing the re-review path, and once more after a zoom-out replacement (below): `git diff HEAD --numstat` over the scope, plus `wc -l` for untracked files, excluding generated files, lockfiles, and contract output.
- **Zoom out** on a fix diff, once, in any round but the gate and audit fixes, at the first of two points: at the count above, when the fix diff is large (as the large path below defines it); or once you have checked the findings of a re-review of it, when they hold more `introduced` `blocker` and `fix` findings than the `blocker` and `fix` findings in the briefs of the fixes it reviewed (a red check or a survivor has no severity, so counts as neither). Before anything more is briefed or committed, start one fresh read-only *reviewer*, the zoom-out reviewer. Its brief is self-contained, every path absolute, and holds:
  - the main checkout;
  - each finding the fix diff answered, as its source states it but with no fix text (for a red check or a survivor, its command and output), and nothing from the fix briefs, the cold reads, or your calls;
  - the fix diff: `git diff -U30 HEAD -- <scope>` plus every untracked file in scope, read in full, while the fixes are uncommitted, or `git diff -U30 <commit before the fixes>..<the fixes' commit> -- <scope>` once they're committed;
  - doctrine: `<bundles>/slice-reviewer.md`, read in full first, and the repo's instructions; a rule the bundle cites by its library path, such as `invariants/concurrency-review.md`, is in the bundle under its `<!-- rule: <path> -->` line;
  - its one question, and no other hunt: where does the fix diff add machinery, flags, special cases, or a second path around a model that is wrong, and what smaller change to the design removes the same harms? It reports each such place as a finding: the fix diff's `file:line`s; as its problem, what that code adds around which model; as its harm, that code itself, still there at those `file:line`s; the harms that code answers, each quoted from its source; the smaller change as its concrete fix; severity `fix` (or `decision` when the smaller change is one of several options that each work); and origin `introduced`; or it reports none;
  - read only, except for its report `<main checkout>/.plans/scratch/cycle-<id8>/zoom-<round>.md`, with `<round>` the round whose fixes it read, saved with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), or the whole report as the reply if saving is refused; reply with the path only.

  Its findings count toward no divergence check. Check its findings as step 2 says; then they are ordinary findings for step 5, briefed before the round's other findings, though their fixes span more than their own `file:line`. Each brief quotes the zoom-out finding and, under "Harms to keep gone", the harm line of every finding the replaced code answered (for a red check, its command and output; for a survivor, its entry), each quoted from its source, so the critic and the commands check those harms stay gone. After those briefs pass, check any of the round's other findings again, drop those whose code is gone, and brief the rest. Once they pass, count the fix diff afresh and take the path that count picks, from its first step (the small path's fresh reviewer, or the large path's step 1). Neither that count nor a re-review of the replaced diff starts a second zoom-out; on the large path, the next round's fix diff is a new one and may. When the zoom-out reviewer reports none, carry on where you were: the path the count chose, or the re-review's findings.
- **Small fix diff** (under 400 changed lines of hand-written code): review it before committing with one fresh reviewer subagent, briefed as in step 2 with its own report file. A fixer subagent fixes what it finds (as in step 5). Run the targeted checks for what the fixes touched, then the mutation run, and commit with explicit paths, the message as step 4 says. Done.
- **Large fix diff** (400 changed lines or more, or a new slice or schema or contract change): the fixes are new work, so they go round the cycle like the original:
  1. Run the targeted checks for what the fixes touched, then the mutation run, then commit them, commit first as in step 4.
  2. Review that commit's diff with steps 2–3: slices, fanned-out reviewers, coverage.
  3. Fix as in step 5, then judge the new fix diff by size again.
- Keep going round until a round's fix diff is small. After **three rounds**, stop and go to step 7 with what's left rather than looping.
- **Mutation, once per round, round 0, `gate`, and `audit` included,** last before the round's commit and after that round's re-review fixes and targeted checks: make `<main checkout>/.plans/scratch/cycle-<id8>/wt-mutation-<round>` and run `Mutation` from `<base directory>/references/cycle.md` over the source files that round's fixes changed, plus every existing source file recorded for a test-only fix item in step 5, even when the test item's slice does not own that source. If the repo's instructions name no mutation command, report `mutation: not run (the repo's instructions name no mutation command)` and create no mutation worktree.
  - `Mutation` says how to attribute survivors and route them.
- **Full gate, once.** After the last round, run the repo's gate (named in its instructions, e.g. `task check`; if none, its format check, lint, typecheck, and fast tests). With a named spec, run every Done-means check again here; a red one goes to a fixer as a red gate does. If the gate is red, brief a fixer subagent with the failing check (as in step 5), rerun **only the failing tests**, then run the `gate` round's mutation once, and commit, the message as step 4 says. Never rerun the whole gate to confirm a fix. If they're still red after one fix, or the critic FAILs that fix, stop and go to step 7 with what's failing rather than looping.
- With a named spec, when a round ends with no unbuilt requirement open against a Piece or Addendum the `**Built pieces:**` line does not name, whether its fixers closed them or its reviewer found none, add its id to that line, so it counts as built here and a later `/go` skips it. Step 7 sets the spec's status.
- Perform no release action. A release action happens only when the user requests it separately after the cycle.

## 7. Audit

A fresh read-only *auditor* subagent says what is still open, routes each open item by the gap rule, and writes the report. You don't write the report, and nothing of yours but the ledger reaches the auditor. The audit runs however the cycle ended, a stop included.

- Write the auditor brief to `<main checkout>/.plans/scratch/cycle-<id8>/audit-brief-<n>.md`, with `<n>` `1` for the audit and `2` for the re-audit. It holds the full text of `<bundles>/auditor.md`, then these, resolved to absolute paths:
  - the main checkout;
  - the named spec, or `Active spec: none`;
  - the cycle's folder, and every evidence file in it, listed by path: each `r*-*.md`, `zoom-*.md`, `source-*.md`, `brief-*.md`, `report-*.md`, `cold-brief-*.md`, `cold-*.md`, `critic-brief-*.md`, `critic-*.md`, `commands-*.md`, and patch file, each mutation report, and `runs/`;
  - the ledger;
  - the cycle's commit range, from the commit before step 4's first commit to `HEAD`, for read-only git;
  - the repo's instructions;
  - step 8's template;
  - the report path `<main checkout>/.plans/scratch/cycle-<id8>/audit-<n>.md`;
  - on the re-audit, `audit-1.md` and the numbers of the items it sent for fixing.

  Nothing else of yours goes in it: no notes, no draft, and no account of the cycle. The brief is self-contained.
- An audit that leaves out an input its brief listed, breaks the template, or gives an item no route is the auditor's fault: start one fresh auditor on the same brief, once.
- Check each claim the audit's report relies on, at its `file:line` or by rerunning its command, as AGENTS.md 'Reports' says. Where your check contradicts a claim, keep the claim and your evidence for step 8. Never edit the audit.
- **The audit's `fix-now` and `send-back` items are fixed before the report,** as the `audit` round:
  - an item whose fix needs a design call is settled first, as step 5 says no fixer starts on a question; one that neither a fact nor an agreed rule settles goes to Needs from you as a decision, with the audit's options, and isn't fixed this cycle;
  - each goes to the fixer of the slice that owns it, as step 5 says, quoting the audit's item and its sources, with a critic as step 5 says; an item no slice owns gets a brief of its own;
  - then run the targeted checks for what the fixes touched, the `audit` round's mutation once, as step 6 says, and commit, the message as step 4 says;
  - the full gate doesn't rerun, and the `audit` round doesn't count toward the three-round cap;
  - an item left unbuilt under `Retry rules` is an `unbuilt` ledger entry.

  When the cycle stopped early (a `blocker`, the round cap, or a red gate), there's no `audit` round: the audit's report is the last, and its `fix-now` and `send-back` items are in Needs from you as unfinished.

  Otherwise brief the re-audit, with those items' numbers. There's no third audit: the re-audit's report is the last. When the audit sends nothing for fixing, its report is the last.

## 8. Report

With a named spec, set its status first, from the last audit: when all its Pieces and Addenda are done, meaning none is unbuilt, the audit leaves no item open against one, and every Done-means check has passed since the last fix or the user has waived it, set that exact named spec path to `built (<final commit hash>)`. Otherwise leave it `building`; the report's Needs from you says what's left.

Then save the last audit's Report section, word for word, to `<main checkout>/.plans/scratch/cycle-<id8>/report.md`, with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), then give it. The report is a saved record of the cycle. After its last line, add `**Orchestrator disagrees:** 1. <the audit's claim, quoted> — <your evidence: the file:line, or the command and its exit code>` for each claim step 7's check contradicted, and leave the line out when there are none.

The auditor fills in this template:

```
**TLDR:** <plain English>
**Findings:** 1. <finding that changes the picture, stated in full; a parked `existing` finding of a check that can't fail, valid input refused, dropped, or excluded to make something pass, or machinery doing a maintained tool's job is one>, or none
**Commits:** <hash subject> (+ fixes <hash>, one per round, and the `audit` round)
**Read in full:** <with `diff`, the files read in full; leave the line out with `full`>
**Fixed:** <one line per notable fix>
**Critic says:** <each fix brief's verdict, its judgement findings, and its PARTIAL gaps; leave the line out when no fix brief ran>
**Not checked:** <PARTIAL gaps, `mutation: not run (…)`, and any other unrun check, with its cause>
**Mutation:** <each round's survivors, or `mutation: not run (…)`>
**Dropped nits:** <one line, or none>
**Parked:** 1. <gap> · fix: <the concrete fix, ~N lines> · design call: <none | the call> · who hits it: <who, and how> (rec: fold now | leave, why), or none
**Worktrees left behind:** <paths; leave the line out when none>
**Needs from you:** 1. … (rec: …), or none. Release actions happen only when the user requests them separately.
**Audited:** <the audit report paths>
```

**Needs from you** is as AGENTS.md 'Reports' defines it. It holds each `decision` finding with a recommended answer, and each item the audit sent for fixing that is still open, as unfinished with its cause, never in Parked.
