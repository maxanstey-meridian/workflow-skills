# Cycle procedures

## Cold read

A fix brief whose fix is a call you made gets a fresh read-only *cold reader* before its fixer starts. A call you made is any fix other than a reviewer's concrete fix applied as written, or a mechanical fix for a red check or a surviving mutant: you chose between fixes, changed the reviewer's, traced a question to reach it, or made a new call under `Retry rules`. One cold read per brief covers every finding in it that carries such a call.

- Write its brief to `<main checkout>/.plans/scratch/cycle-<id8>/cold-brief-<name>.md`, with the fix brief's `<name>`. It is self-contained, every path absolute, and holds:
  - the main checkout and the tree the fixer will work in;
  - each such finding as the fix brief quotes it, and its `Call` line, without how you reached the call;
  - on a re-brief, the earlier critic reports' FAIL bullets and Outcome evidence for the item;
  - doctrine: the fixer's bundle(s), read in full first, and the repo's instructions; a rule the bundle cites by its library path, such as `invariants/concurrency-review.md`, is in the bundle under its `<!-- rule: <path> -->` line;
  - scope: read the code, and run only commands that write nothing in that tree; never edit, build, run the gate, or commit;
  - rules: trace every caller and consumer the changed code feeds, with `file:line`s; say whether each harm exists as reported and whether each call removes it, shown against the code or a run that writes nothing, and name every place a call doesn't, or breaks what works today; say whether each call changes the model or adds machinery, flags, special cases, or a second path around a model that is wrong, with that model's `file:line`s; report facts only, with no recommendation, option, confidence, or ask;
  - report path `<main checkout>/.plans/scratch/cycle-<id8>/cold-<name>.md`, saved with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), or the whole report as the reply if saving is refused; reply with the path only.
- Check its claims at their `file:line`s before briefing the fixer. Where they hold, revise the call, and drop a finding whose harm doesn't exist as a false positive, as a `dropped` ledger entry; on a re-brief, its fixer undoes the edits already made for it. A call it shows bolting on is revised to change that model instead, with an addendum first when that alters the named spec, as SKILL.md step 5 says; when changing the model is a choice between options that each work, pick one yourself and record it as a `call` ledger entry, since holding the call back would leave the harm in the tree. The revised call is not read again. A harm no call of yours removes is a question, traced as SKILL.md step 5 says; when facts can't settle it, leave the item unbuilt and record it as an `unbuilt` ledger entry whose cause is the open call and its options, as `Retry rules` does. The critic's outcome check and `Retry rules` catch a revised call that still misses.

## Critic procedure

A fresh *critic* subagent checks each fixer brief before the next check and before the round's re-review. Run git commands from the root of the tree being built (`git rev-parse --show-toplevel`), and keep working files under `<main checkout>/.plans/`.

- A fixer, critic, or cold reader that replies with its report instead of a path: save the reply to its file verbatim.
- Reports are claims. The critic checks the fixer's; you check the critic's with your own runs.
- **Contracts.** If the repo generates API contracts or clients, regenerate them when an endpoint changed and run the repo's contract check, as its instructions name, before the critic and before mutation.
- **After each fixer brief:**
  1. Make the ready worktree `<wt>` at `<main checkout>/.plans/scratch/cycle-<id8>/wt-<name>`, with no trailing slash, before the critic starts, as `Worktree snapshots` says.

     Setup precedes the critic. A build failure is a command FAIL with its exit code, routed to the slice that owns the failing file. Any other setup failure is BLOCKED, your verdict, and no critic starts.
  2. Changed files, from the ready worktree, whose untracked files are marked with intent to add: `git -C <wt> diff --name-only --diff-filter=d HEAD -- <owned paths>`. The list includes new files and the slice's earlier briefs, and deletions stay out of it. The critic's patch is the Fix patch under Worktree snapshots, which holds only this fix's lines. Leave the patch unread.
  3. Commands, in `<main checkout>/.plans/scratch/cycle-<id8>/commands-<name>.md`, beside the fix brief and the patch: the targeted tests for the changed test files and the behaviour the fix brief's findings name, and format and lint in check mode on the changed paths where the command takes paths, else whole, as the instructions name it. For each finding with a harm, and each harm a zoom-out brief lists under "Harms to keep gone", at least one command exits non-zero while that harm remains: where it shows in a run, a command that runs the behaviour (the wrong output line is still there, the request still gets the old status; a doc that overstates the code is one, because the code must now do what the doc says); where the harm is the code itself (dead code, a type assertion, a compat shim), one that fails while that code is still there; for a red check, that check. A command that only shows the fix's new code is present doesn't count. For a test-only finding or a surviving mutant, the command runs the new or changed test, and that it would fail stays unverified: no command breaks code. Where no command can show a harm gone here, say so in the file. Each command runs from the worktree root and carries its own `cd` where the repo's instructions run it from a subfolder.
  4. Write the critic brief to `<main checkout>/.plans/scratch/cycle-<id8>/critic-brief-<name>.md`: the full text of the critic bundle for each stack the fix brief's bundle(s) name (`<base directory>/references/bundles/backend-critic.md` for `backend.md`, `<base directory>/references/bundles/frontend-critic.md` for `frontend.md`, or both), then these, resolved to absolute paths: the main checkout, ready worktree, owned and forbidden paths, named spec (or `Active spec: none`), fix brief, the files its quotes come from, fixer report, patch, commands, earlier critic reports, report `<main checkout>/.plans/scratch/cycle-<id8>/critic-<name>.md`, and the repo's instructions. Add every relied-on decision quoted word for word from its source, and the paths the repo's instructions declare as disposable check output. The brief is self-contained: it relies on no other file, prior conversation, or another agent's instructions to understand the task.
- **The verdict** is the last line of the critic's report: `VERDICT: PASS | FAIL | PARTIAL`. FAIL beats every other verdict; PASS and PARTIAL both count as passed once your checks agree.
  - On every verdict, recompute the fingerprint, rerun every command you built and every extra one in the critic's Checks run once, and read every cited line for judgement findings.
  - A red from a file that entered the tree after step 1's scope is a `peer-red` ledger entry.
  - Any of your commands that exits non-zero on your rerun is a fixer command FAIL, with your exit code. A confirmed Missing, Extra, Misunderstood, or Not achieved is a fixer FAIL; you confirm a Not achieved shown by a run with your rerun of its command. Judgement findings reach the user labelled as the critic's; act on one only after reading its cited `file:line`.
  - A changed fingerprint or an unparseable verdict is the critic's fault, not the fixer's: start a fresh critic in a fresh worktree before any fixer is briefed.
  - **BLOCKED** is yours for a setup failure that isn't a build failure from a slice's files; record it as a `blocked` ledger entry with its log. The round still carries on.
  - After your checks, `git worktree remove --force <wt>`; one you couldn't remove is a `worktree-left` ledger entry.
- **A FAIL** goes back, as its confirmed bullets, to the slice that owns that file, as a new brief to a fresh fixer. A test-only mutation FAIL keeps the test-item owner even when that slice does not own the cited source file. A problem no slice covers is a brief of its own.
- **A brief that isn't working** is handled as `Retry rules` says.

## Worktree snapshots

- **Before snapshot:** a before snapshot for every fixer brief, with no setup or checks. The round's first brief uses `<before>` = `<main checkout>/.plans/scratch/cycle-<id8>/wt-pre-round-<round>`; each later brief uses `<before>` = `<main checkout>/.plans/scratch/cycle-<id8>/wt-pre-<name>`. Snapshot the whole uncommitted tree with the output exclusions the repo's instructions declare and these three commands:
  - `git worktree add --detach <before> HEAD`
  - `git diff HEAD --binary | git -C <before> apply --allow-empty`
  - `git ls-files -z --others -- . ':(exclude).plans/' <output exclusions> | tar --null -T - -cf - | tar -xf - -C <before>`
- **Critic worktree:** after the fixer finishes, make the ready worktree `<wt>` at `<main checkout>/.plans/scratch/cycle-<id8>/wt-<name>`, with no trailing slash, before the critic starts:
  - `git worktree add --detach <wt> HEAD`
  - `git diff HEAD --binary | git -C <wt> apply --allow-empty`
  - `git ls-files -z --others -- . ':(exclude).plans/' <output exclusions> | tar --null -T - -cf - | tar -xf - -C <wt>`

  Each output exclusion is a quoted Git pathspec, `':(exclude)<path>'`, for a disposable check-output path declared in the repo's instructions. This copies ignored inputs too; only `.plans/` and those declared outputs stay out. With no declared outputs there are no output exclusions.
  - Run the restore, install, and build the repo's instructions name. When they name none, record the lockfiles' absence and what you ran as a `setup-inferred` ledger entry.
  - Mark non-ignored untracked files with intent to add: `git -C <wt> ls-files --others --exclude-standard -z | xargs -0 git -C <wt> add -N --`.
- **Fingerprint:** once the critic worktree is ready, before the critic starts, save it: `(cd <wt> && { git status --porcelain=v1 -z -- . <output exclusions>; git diff --binary HEAD -- . <output exclusions>; }) | shasum > <wt>.fp`.
- **Fix patch:** after the fixer finishes and its critic worktree is ready, for each slice file, append the output of `git diff --no-index -U3 --binary -- <before-file> <critic-file>` between the before snapshot and critic worktree to `<main checkout>/.plans/scratch/cycle-<id8>/diff-<name>.patch`, using `/dev/null` when either side is absent and treating exit 1 as differences. Pass this patch to the critic as its patch input. Extra is limited to lines this fix changed; Missing and Misunderstood retain their existing scope.
- **Removal:** remove each later brief's before snapshot after producing its patch. Keep the round snapshot until that round's mutation step ends, whether it ran, was not run, or was BLOCKED, then remove it. Remove the mutation worktree after survivor attribution, once its report is copied (see `Mutation`). Remove critic worktrees when their use ends. Each one left behind is a `worktree-left` ledger entry.

## Retry rules

- The first time an item comes back unbuilt or FAILs, make the missing design call yourself (after a FAIL that shows the harm still there or the brief's premise false, a new call built on the critic's evidence, never the call that failed; when it shows the harm never existed, the call is to undo that finding's edits), give the re-brief its `Cold read`, then send the item back as a brief of its own to a fresh fixer, with that call as its `Call` line. Read the critic's sign facts at their `file:line`.
- Any of these means the brief failed first: an item comes back unbuilt, or FAILs, twice in a row; a check shrinks to make it pass; a required part of the item is reported as not traced, not checked, or not confirmed; a design call the fixer made itself.
- Don't revert anything yourself. Trace the question, make the call yourself, give it its `Cold read`, then re-brief the item. If any sign or FAIL comes back on the narrowed brief, leave the item unbuilt, carry on with the other items, and record it as an `unbuilt` ledger entry.
- Combine all of a test-only item's survivor bullets from one mutation result into one failure, even for overlapping regions or several mutants; charge that item only once under this retry rule.

## Mutation

- A mutant is a small deliberate change to the code, and a surviving mutant is one no test noticed. A mutation report is the JSON file the mutation command writes, in the mutation-testing-elements format. With no mutation command in the repo's instructions, record a `not-run` ledger entry saying so and create no mutation worktree. Otherwise:
  - Make `<wt>` = `<main checkout>/.plans/scratch/cycle-<id8>/wt-mutation-<round>` as the **Critic worktree** bullet under `Worktree snapshots` says, its intent-to-add marking included, with no fingerprint.
  - Mutate each source file that round's fixes changed that exists, plus every existing source file recorded for a test-only fix item, even when the test item's slice does not own that source. Exclude deletions and other peers' files. Before mutation, resolve each test-only item's promised guarded regions to current-file line ranges in the ready mutation worktree. Include them even when the source is unchanged.
  - For each mutation file, compare its round-snapshot file with the mutation file using `git diff --no-index -U0 -- <before-file> <mutation-file>`; exit 1 means differences. Compare an absent before-file with `/dev/null`. This round's current-file `+` ranges are its changed-source lines. When the repo command accepts ranges, supply the union of those ranges and the promised guarded regions.
  - Count mutants with `jq '[.files[].mutants[] | select(.status != "Ignored")] | length' <report>`. Zero counted mutants is a `not-run` ledger entry ("no mutants in scope"). No report, or a worktree that won't set up, is BLOCKED: record a `blocked` ledger entry with its log; it stops only this step.
  - Before the worktree is removed, copy the report to `<main checkout>/.plans/scratch/cycle-<id8>/mutation-<round>.json`, and have the `run` ledger entry for the mutation command point at the copy.
  - List survivors with `jq -r '.files | to_entries[] | .key as $f | .value.mutants[] | select(.status == "Survived" or .status == "NoCoverage") | "\($f):\(.location.start.line) \(.mutatorName) \(.replacement)"' <report> | sed "s|^<wt>/||" | sort -u`.
  - Only Survived and NoCoverage fail; Timeout and RuntimeError count as killed, and CompileError and Ignored are unscored.
  - A Survived or NoCoverage mutant in a promised guarded region is an `introduced` finding that fails every test-only fix item that promised that region, routed to each test item's owner even when its slice does not own the source file. Changed-source attribution is additive: a survivor inside a current-file `+` range is also `introduced` and fails the source-owning slice's current item. Route each item's survivors as one counted failure, as `Retry rules` says.
  - A survivor outside both the promised guarded regions and the changed-source ranges is `existing`. Route each finding through step 5's rules for its origin, retaining the test-item owners above.
  - A survivor sent to a fixer gets a fresh fixer brief, a critic, and this section's ordinary targeted checks, never a second mutation run.
