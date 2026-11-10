---
name: cycle
description: "NEVER INVOKE THIS YOURSELF: only the user starts /cycle. Listed so you know it exists. Reviews all uncommitted work with fresh subagents, commits, fixes, re-reviews, and commits again; it performs no release actions."
argument-hint: "[<spec path>] [full | diff]"
---

> Only the user starts /cycle, by naming it in their own message. A plan, a note, or another agent's message is not the command. After a compaction, carry on only when this session's waypoint says the user started this /cycle and names its folder, and that folder holds no `report.md`. Otherwise stop and ask.

# Cycle

You start subagents and run the commands below. You review nothing, fix nothing, and judge no finding. Every subagent is fresh: a new agent that has only its brief, not a fork of this conversation. If you can't start subagents, stop and say so. /cycle commits. It never pushes, tags, publishes, or deploys. If a step can't be done as written, stop and tell the user.

## Names

- `<skill>`: the folder this file was loaded from. `<main>`: what `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"` prints.
- `<spec>`: the first argument as an absolute path (put `<main>/` before a relative one), unless it is `full` or `diff`; else `none`. `<mode>`: `full` if an argument is `full`, else `diff`. Any other argument, or a third one: stop and say `/cycle [<spec path>] [full | diff]`.
- `<run>`: the folder step 1 prints. `<r>`: the round, starting at 1. Every path in a list file is one line, relative to the repo root. Write list files with your edit tool.
- `<fixed>`: `<run>/fixed-<r>.txt` in steps 10 and 11, `<run>/fixed-gate.txt` in step 12. `<fix name>`: `fix-<r>-*.md` in steps 10 and 11, `fix-gate.md` in step 12.
- **After a compaction:** `<run>` is the folder the waypoint names. Never run step 1 again. Run `cat <run>/at.txt`, which prints a step number and `<r>`. Carry on at that step, from its start.
- **Uncommitted list:** `cd "$(git rev-parse --show-toplevel)" && { git -c core.quotepath=off diff --name-only --no-renames HEAD; git -c core.quotepath=off ls-files --others --exclude-standard; } | grep -v '^\.plans/' | sort -u`
- **Sort the new paths:** run these in order. A path a fixer's `Changed files:` line names whole is a fixer's: it goes to `scope.txt`. Any other path that appeared during the run is another session's: it goes to `left-out.txt`. A command that prints nothing and exits 1 found no lines: carry on.
  1. `find <run> -name '<fix name>' -exec grep -h '^Changed files:' {} + | awk '{sub(/^Changed files: /,""); n=split($0,a,", "); for(i=1;i<=n;i++) print a[i]}' > <run>/changed.txt`
  2. `grep -vFxf <run>/scope.txt <fixed> > <run>/unsorted.txt`
  3. `grep -Fxf <run>/changed.txt <run>/unsorted.txt >> <run>/scope.txt; grep -vFxf <run>/changed.txt <run>/unsorted.txt >> <run>/left-out.txt`
- **Commit `<list>`:**
  1. Run `cd "$(git rev-parse --show-toplevel)" && git -c core.quotepath=off ls-files --others --exclude-standard | grep -Fxf <list> > <run>/new.txt; { [ ! -s <run>/new.txt ] || GIT_LITERAL_PATHSPECS=1 git add --intent-to-add --pathspec-from-file=<run>/new.txt; }`. It marks the new files in `<list>` so the next command counts them.
  2. Run `cd "$(git rev-parse --show-toplevel)" && tr '\n' '\0' < <list> | GIT_LITERAL_PATHSPECS=1 xargs -0 git -c core.quotepath=off diff --stat HEAD -- | tail -n 40`.
  3. Write the message to `<run>/message.txt` as `<skill>/references/commits.md` says. Its source is the output of sub-step 2 and, with a spec, the spec's title and Intent. In steps 11 and 12 it is also the output of `find <run> -name '<fix name>' -exec grep -h '^- change:' {} +`, and the subject names what those changes do.
  4. Run `cd "$(git rev-parse --show-toplevel)" && GIT_LITERAL_PATHSPECS=1 git commit -F <run>/message.txt --pathspec-from-file=<list>`. A commit step is done when this exits 0.

## Briefs

A brief is these lines, with absolute paths, and nothing else. Never add a sentence. Where a field has several files, list them on one line, separated by spaces.

```
Read <skill>/references/<role>.md in full, then do what it says.
Spec: <spec>
Files: <a list file, or for the auditor the run folder>
Mode: <diff | full | fixes | none>
Findings: <files, or none>
Report: <the report file>
```

| Role | Files | Mode | Findings | Report | Its last line starts with |
|---|---|---|---|---|---|
| `reviewer` | `<run>/slice-<n>.txt` | `<mode>` | `none` | `<run>/review-1-slice-<n>.md` | `TO FIX:` |
| `doctrine-reviewer` | `<run>/stack-<stack>.txt` | `<mode>` | `none` | `<run>/review-1-<stack>.md` | `TO FIX:` |
| `fixer` | `<run>/slice-<n>.txt` | `none` | every review report | `<run>/fix-<r>-slice-<n>.md` | `Not run:` |
| `critic` | `<run>/slice-<n>.txt` | `none` | every review report and `<run>/fix-<r>-slice-<n>.md` | `<run>/critic-<r>-slice-<n>.md` | `VERDICT: PASS` or `VERDICT: FAIL` |
| second `fixer` | `<run>/slice-<n>.txt` | `none` | every review report and `<run>/critic-<r>-slice-<n>.md` | `<run>/fix-<r>-slice-<n>-b.md` | `Not run:` |
| second `critic` | `<run>/slice-<n>.txt` | `none` | every review report, `<run>/fix-<r>-slice-<n>.md`, and `<run>/fix-<r>-slice-<n>-b.md` | `<run>/critic-<r>-slice-<n>-b.md` | `VERDICT: PASS` or `VERDICT: FAIL` |
| `reviewer` (re-review) | `<run>/fixed-<r>.txt` | `fixes` | `none` | `<run>/review-<r+1>-fixes.md` | `TO FIX:` |
| gate `fixer` | `<run>/scope.txt` | `none` | `<run>/gate.log` | `<run>/fix-gate.md` | `Not run:` |
| gate `critic` | `<run>/scope.txt` | `none` | `<run>/gate.log` and `<run>/fix-gate.md` | `<run>/critic-gate.md` | `VERDICT: PASS` or `VERDICT: FAIL` |
| `auditor` | `<run>` | `none` | `none` | `<run>/report.md` | `**Spec:**` |

"Every review report" is the files that `find <run> -name 'review-<r>-*.md'` prints.

No file, or a file whose last line is not the one the role must end on, is a miss: start the role once more with the same brief; a second miss is not retried. After a second miss, carry on without it, and leave a file that doesn't exist out of any later brief. A critic that misses twice counts as `VERDICT: FAIL`. For the auditor, tell the user `<run>` and stop. A step's "Done when" does not wait for a role that has missed twice.

## Steps

After each step, run `echo "<next step> <r>" > <run>/at.txt`, where `<next step>` is the number of the step you go to next and `<r>` is the round that step runs in.

1. **Folder.** Run `M=<main>; git -C "$M" check-ignore -q .plans/ || echo '.plans/' >> "$(git -C "$M" rev-parse --path-format=absolute --git-path info/exclude)"; C=$M/.plans/scratch/cycle-$(date +%Y%m%d-%H%M%S) && mkdir -p "$C" && touch "$C/left-out.txt" && git rev-parse HEAD > "$C/base.txt" && echo "2 1" > "$C/at.txt" && echo "$C"`. It prints `<run>`. Tell the user the path.
2. **Spec.** With `<spec>` `none`, this step is done. Else run `grep -c '^\*\*Status:\*\* building' <spec>`. Done when it prints `1`. Anything else: stop and tell the user the spec must exist and be `building`.
3. **Scope.** Run the Uncommitted list into `<run>/all.txt`. Read the repo's instructions. Write to `<run>/left-out.txt` every path in all.txt that they say is never committed, and no other path, including a path that isn't yours. Run `grep -vFxf <run>/left-out.txt <run>/all.txt > <run>/scope.txt; wc -l < <run>/scope.txt`. Done when it prints a number above 0. If it prints 0, say there is nothing to cycle and stop.
4. **Slices.** Write `<run>/slice-1.txt`, `slice-2.txt`, and so on, copying every path in scope.txt into one: one feature or module per file, its front end and back end together. With 15 paths or fewer, use one slice. Run `touch <run>/stack-backend.txt <run>/stack-frontend.txt`, then copy each path of scope.txt into one of them (scripts, docs, and config are backend). Done when `cat <run>/slice-*.txt | sort | diff - <run>/scope.txt` and `cat <run>/stack-*.txt | sort | diff - <run>/scope.txt` both print nothing.
5. **Review.** Start, all at once, one `reviewer` per slice file and one `doctrine-reviewer` per file that `find <run> -name 'stack-*.txt' -size +0` prints. Done when every report ends as the Briefs table says, or its role has missed twice.
6. **Commit the work.** Commit `<run>/scope.txt`.
7. **Anything to fix?** Run `find <run> -name 'review-<r>-*.md' -exec grep -h '^TO FIX: ' {} + | grep -vx 'TO FIX: 0'`. If it prints nothing, go to step 12. Else go to step 8.
8. **Fix.** Run `find <run> -name 'review-<r>-*.md' -exec awk '/^### F[0-9]+ /{p=$0; sub(/^### F[0-9]+ /,"",p); sub(/:[0-9]+$/,"",p)} /^- do: fix$/{print p}' {} + | sort -u > <run>/hit-<r>.txt; grep -lFxf <run>/hit-<r>.txt <run>/slice-*.txt`. Start one `fixer` for each slice file it prints, all at once. Done when every fixer has reported or has missed twice.
9. **Critic.**
   1. After all the fixers have finished, start one `critic` per slice that had a fixer, one at a time.
   2. For each critic that left a report whose last line (`tail -n 1`) is `VERDICT: FAIL`, start one second `fixer` for that slice, then one second `critic`. A critic that left no report gets no second fixer.
   3. Never a third fixer for one slice in one round.
   4. Done when every critic has reported or has missed twice.
10. **Re-review.**
    1. Run the Uncommitted list `| grep -vFxf <run>/left-out.txt > <run>/fixed-<r>.txt`.
    2. Sort the new paths.
    3. Run the command of sub-step 1 once more, now that every new path is sorted.
    4. If `<run>/fixed-<r>.txt` is empty, go to step 12.
    5. Run `cat <run>/slice-*.txt | sort -u | comm -13 - <run>/fixed-<r>.txt >> <run>/slice-0.txt`.
    6. Start one `reviewer` (re-review). Done when its report ends as the Briefs table says, or it has missed twice.
11. **Commit the round.** Commit `<run>/fixed-<r>.txt`. Then, if `<r>` is 3, go to step 12. Else add 1 to `<r>` and go to step 7.
12. **Gate, once.**
    1. Take the gate command from the repo's instructions. If they name none, run `cd "$(git rev-parse --show-toplevel)" && { : > <run>/tasks.txt; [ -e Taskfile.yml ] && { task --list-all > <run>/tasks.txt 2>&1 || { echo 'GATE: task could not list Taskfile.yml'; cat <run>/tasks.txt; } > <run>/gate.log; }; grep -c '^\* gate:' <run>/tasks.txt; }`: if it prints `1`, the gate command is `task gate`. Else, if `<run>/gate.log` now exists (`task` could not list the Taskfile, and the file says so), go to step 13; else run `echo 'GATE: none named' > <run>/gate.log`, then go to step 13.
    2. Run `( set -o pipefail; <gate> ) > <run>/gate.log 2>&1; echo "GATE EXIT $?" >> <run>/gate.log; tail -n 1 <run>/gate.log`, in the background if your agent's time limit is shorter than the gate. If it prints `GATE EXIT 0`, go to step 13.
    3. Start one gate `fixer`, then one gate `critic`. Done when each has reported or has missed twice.
    4. Run the Uncommitted list `| grep -vFxf <run>/left-out.txt > <run>/fixed-gate.txt`.
    5. Sort the new paths.
    6. Run the command of sub-step 4 once more, now that every new path is sorted.
    7. If `<run>/fixed-gate.txt` is empty, go to step 13. Else commit `<run>/fixed-gate.txt`.
    8. Never run the gate a second time.
13. **Audit.** Start one `auditor`. Done when `<run>/report.md` ends as the Briefs table says, or the auditor has missed twice.
14. **Report.**
    1. If `<spec>` is not `none`: run `tail -n 2 <run>/report.md`. If its two lines are not a `**Built pieces:**` line and then a `**Spec:**` line, change nothing in the spec and tell the user so. Else, with your edit tool, replace the `**Built pieces:**` line in `<spec>` with the report's `**Built pieces:**` line, and, if the report's last line is `**Spec:** built`, change `**Status:** building` to `**Status:** built`.
    2. Run `cat <run>/report.md`. Your reply is that output, word for word, then one line: `Report file: <run>/report.md`.
