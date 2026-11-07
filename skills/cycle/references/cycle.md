# Cycle procedures

## Critic procedure

A fresh *critic* subagent checks each fixer brief before the next check and before the round's re-review. Run git commands from the root of the tree being built (`git rev-parse --show-toplevel`), and keep working files under `<main checkout>/.plans/`.

- A fixer or critic that replies with its report instead of a path: save the reply to its file verbatim, and tell the user which one.
- Reports are claims. The critic checks the fixer's; you check the critic's with your own runs.
- **Contracts.** If the repo generates API contracts or clients, regenerate them when an endpoint changed and run the repo's contract check, as its instructions name, before the critic and before mutation.
- **After each fixer brief:**
  1. Make the ready worktree `<wt>` at `<main checkout>/.plans/scratch/cycle-<id8>/wt-<name>`, with no trailing slash, before the critic starts, as `Worktree snapshots` says.

     Setup precedes the critic. A build failure is a command FAIL with its exit code, routed to the slice that owns the failing file. Any other setup failure is BLOCKED, your verdict, and no critic starts.
  2. Changed files, from the ready worktree, whose untracked files are marked with intent to add: `git -C <wt> diff --name-only --diff-filter=d HEAD -- <owned paths>`. The list includes new files and the slice's earlier briefs, and deletions stay out of it. The critic's patch is the Fix patch under Worktree snapshots, which holds only this fix's lines. Leave the patch unread.
  3. Commands, in `<main checkout>/.plans/scratch/cycle-<id8>/commands-<name>.md`, beside the fix brief and the patch: the targeted tests for the changed test files and the behaviour the fix brief's findings name, and format and lint in check mode on the changed paths where the command takes paths, else whole, as the instructions name it. Each command runs from the worktree root and carries its own `cd` where the repo's instructions run it from a subfolder.
  4. Write the critic brief to `<main checkout>/.plans/scratch/cycle-<id8>/critic-brief-<name>.md`: the full text of the critic bundle for each stack the fix touches (`<base directory>/references/bundles/backend-critic.md`, `<base directory>/references/bundles/frontend-critic.md`, or both), then these, resolved to absolute paths: the main checkout, ready worktree, owned and forbidden paths, named spec (or `Active spec: none`), fix brief, fixer report, patch, commands, earlier critic reports, report `<main checkout>/.plans/scratch/cycle-<id8>/critic-<name>.md`, log folder `<main checkout>/.plans/scratch/cycle-<id8>/critic-<name>-logs/`, and the repo's instructions. Add every relied-on decision written in full, and the paths the repo's instructions declare as disposable check output. The brief is self-contained: it relies on no other file, prior conversation, or another agent's instructions to understand the task.
- **The verdict** is the last line of the critic's report: `VERDICT: PASS | FAIL | PARTIAL`. FAIL beats every other verdict; PASS and PARTIAL both count as passed once your checks agree.
  - On every verdict, recompute the fingerprint, rerun every command you built and every extra one in the critic's Checks run once, compare exit codes, check that every command you built appears in Checks run, and read every cited line for judgement findings.
  - A red from a file that entered the tree after step 1's scope goes to Needs from you.
  - A confirmed different exit code is a fixer command FAIL with your own exit code. A confirmed Missing, Extra, or Misunderstood is a fixer FAIL. Judgement findings reach the user labelled as the critic's; act on one only after reading its cited `file:line`.
  - A changed fingerprint, an unparseable verdict, or one of your commands missing from Checks run is the critic's fault, not the fixer's: start a fresh critic in a fresh worktree before any fixer is briefed.
  - **BLOCKED** is yours for a setup failure that isn't a build failure from a slice's files. The round still carries on.
  - After your checks, `git worktree remove --force <wt>`; report any you couldn't remove.
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
  - Run the restore, install, and build the repo's instructions name. When they name none, record the lockfiles' absence and "setup inferred: …" under Not checked.
  - Mark non-ignored untracked files with intent to add: `git -C <wt> ls-files --others --exclude-standard -z | xargs -0 git -C <wt> add -N --`.
- **Fingerprint:** once the critic worktree is ready, before the critic starts, save it: `(cd <wt> && { git status --porcelain=v1 -z -- . <output exclusions>; git diff --binary HEAD -- . <output exclusions>; }) | shasum > <wt>.fp`.
- **Fix patch:** this is the only thing written to this patch. After the fixer finishes and its critic worktree is ready, for each slice file, append the output of `git diff --no-index -U3 --binary -- <before-file> <critic-file>` between the before snapshot and critic worktree to `<main checkout>/.plans/scratch/cycle-<id8>/diff-<name>.patch`, using `/dev/null` when either side is absent and treating exit 1 as differences. Pass this patch to the critic as its patch input. Extra is limited to lines this fix changed; Missing and Misunderstood retain their existing scope.
- **Removal:** remove each later brief's before snapshot after producing its patch. Keep the round snapshot until that round's mutation step ends, whether it ran, was not run, or was BLOCKED, then remove it. Remove the mutation worktree after survivor attribution. Remove critic worktrees when their use ends. Report any left behind.

## Retry rules

- The first time an item comes back unbuilt or FAILs, make the missing design call yourself, then send the item back as a brief of its own to a fresh fixer, with that call written in. Read the critic's sign facts at their `file:line`.
- Any of these means the brief failed first: an item comes back unbuilt, or FAILs, twice in a row; a check shrinks to make it pass; a required part of the item is reported as not traced, not checked, or not confirmed; a design call the fixer made itself.
- Don't revert anything yourself. Trace the question, make the call yourself, then re-brief the item. If any sign or FAIL comes back on the narrowed brief, leave the item unbuilt, carry on with the other items, and list it in the report's Needs from you.
- A test-only mutation failure keeps the test-item owner even when that slice does not own the cited source file. Combine all of that item's survivor bullets from one mutation result into one failure, even for overlapping regions or several mutants; charge that item only once under this retry rule.

## Mutation

- Run every targeted check before mutation.
- **Mutation,** once, last, when the checks above are green. A mutant is a small deliberate change to the code, and a surviving mutant is one no test noticed. A mutation report is the JSON file the mutation command writes, in the mutation-testing-elements format. With no mutation command in the repo's instructions, report `mutation: not run (the repo's instructions name no mutation command)` and create no mutation worktree. Otherwise:
  - Make `<wt>` = `<main checkout>/.plans/scratch/cycle-<id8>/wt-mutation-<round>` as the **Critic worktree** bullet under `Worktree snapshots` says, its intent-to-add marking included, with no fingerprint.
  - Mutate each source file that round's fixes changed that exists, plus every existing source file recorded for a test-only fix item, even when the test item's slice does not own that source. Exclude deletions and other peers' files. Before mutation, resolve each test-only item's promised guarded regions to current-file line ranges in the ready mutation worktree. Include them even when the source is unchanged.
  - For each mutation file, compare its round-snapshot file with the mutation file using `git diff --no-index -U0 -- <before-file> <mutation-file>`; exit 1 means differences. Compare an absent before-file with `/dev/null`. This round's current-file `+` ranges are its changed-source lines. When the repo command accepts ranges, supply the union of those ranges and the promised guarded regions.
  - Count mutants with `jq '[.files[].mutants[] | select(.status != "Ignored")] | length' <report>`. Zero counted mutants is `mutation: not run (no mutants in scope)`. No report, or a worktree that won't set up, is BLOCKED and stops only this step.
  - List survivors with `jq -r '.files | to_entries[] | .key as $f | .value.mutants[] | select(.status == "Survived" or .status == "NoCoverage") | "\($f):\(.location.start.line) \(.mutatorName) \(.replacement)"' <report> | sed "s|^<wt>/||" | sort -u`.
  - Only Survived and NoCoverage fail; Timeout and RuntimeError count as killed, and CompileError and Ignored are unscored.
  - A Survived or NoCoverage mutant in a promised guarded region is an `introduced` finding that fails every test-only fix item that promised that region, routed to each test item's owner even when its slice does not own the source file. Changed-source attribution is additive: a survivor inside a current-file `+` range is also `introduced` and fails the source-owning slice's current item. Route each item's survivors as one counted failure, as `Retry rules` says.
  - A survivor outside both the promised guarded regions and the changed-source ranges is `existing`. Route each finding through step 5's rules for its origin, retaining the test-item owners above.
  - A survivor sent to a fixer gets a fresh fixer brief, a critic, and this section's ordinary targeted checks, never a second mutation run.
