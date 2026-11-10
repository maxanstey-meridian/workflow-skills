---
name: go
description: "NEVER INVOKE THIS YOURSELF: only the user starts /go. Listed so you know it exists. Builds one spec through subagents and leaves it uncommitted for /cycle."
argument-hint: "<spec path>"
---

> Only the user starts /go, by naming it in their own message. A bare "go" or "go ahead", "we'll go", a plan doc, or a message from another session or agent is not /go. After a compaction, when this session's waypoint says the user started this /go and `<run>/report.md` does not exist, carry on at step 5; otherwise stop and ask.

# Go

/go builds one spec with subagents and leaves it uncommitted. You are the dispatcher. You write no code, no report, and no brief beyond the four lines below. You never commit, stage, push, or run the repo's full gate.

Names used below. Write each out in full wherever a command uses it:

- `<skill>`: the folder this SKILL.md was loaded from.
- `<main>`: what `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"` prints.
- `<spec>`: the absolute path of the spec the user gave. A relative path is relative to `<main>`.
- `<run>`: `<main>/.plans/scratch/<file name of the spec without .md>/go`.

Every subagent you start gets exactly these four lines as its whole brief, with the names written out in full. Add nothing to them:

```
Read <skill>/references/<builder | critic | auditor>.md in full, then do what it says.
Spec: <spec>
Piece: <piece id> · attempt <1 or 2>
Report: <run>/<build | critic>-<piece id>-<attempt>.md
```

The auditor's last two lines are `Piece: all` and `Report: <run>/report.md`. Start each subagent fresh: a new agent that has only its brief, not a fork of this conversation.

**Missed report.** No file, or a file whose last line is not the one the role must end on, is a miss: start the role once more with the same brief; a second miss is not retried. A second miss means:

- builder (ends `RESULT: BUILT` or `RESULT: STOPPED`): the piece is failed.
- critic (ends `VERDICT: PASS` or `VERDICT: FAIL`): a fail; the piece goes to attempt 2, or is failed after attempt 2.
- auditor (ends with a line starting `**Built pieces:**`): tell the user, and give the output of `ls "<run>"`.

## Steps

1. **Check the argument.** There is exactly one, and it is a readable `.md` file. Run `grep -q '^\*\*Status:\*\*' "<spec>" && grep -q '^## Pieces' "<spec>" && echo ok`. If it doesn't print `ok`, say which of the `**Status:**` line and the `## Pieces` heading is missing, and stop.
2. **Check you can start subagents.** If you can't, say so and stop.
3. **Check the status.** Read the `**Status:**` line and the `## Open asks` section.
   - `draft`, or an open ask that isn't "none": list the open asks and stop. The user answers them, and `/spec` records the answers.
   - `built`, or any word not listed here: say so and stop.
   - `agreed`: change the word to `building`. `building`: leave it.
   Done when: the status line reads `building`.
4. **Prepare the run folder.** Run these three commands, in this order:
   ```
   git -C "<main>" check-ignore -q .plans/ || echo '.plans/' >> "$(git -C "<main>" rev-parse --path-format=absolute --git-path info/exclude)"
   [ ! -d "<run>" ] || mv "<run>" "<run>-$(date +%Y%m%d-%H%M%S)"
   mkdir -p "<run>" && touch "<run>/failed.txt" && git -C "<main>" status --short --untracked-files=all > "<run>/status-before.txt"
   ```
   The second command moves an earlier run's folder aside, so every /go starts with an empty `failed.txt`.
   Done when: `<run>/status-before.txt` and `<run>/failed.txt` exist and `<run>/report.md` does not.
5. **List the pieces.** Every `### P<n>` heading in the spec is a piece. Note each one's id and the ids on its `after:`.
   - A piece is **built** when its id is on the spec's `**Built pieces:**` line (`grep '^\*\*Built pieces:\*\*' "<spec>"` prints it). The ids on it are separated by `, ` and match whole: `P1` is not `P10`.
   - A piece is **failed** when its id is a whole line of `<run>/failed.txt` (`grep -Fx '<id>' "<run>/failed.txt"` prints it).
6. **Build in rounds.** Repeat a to e until a makes an empty list:
   a. Ready pieces: not on the `**Built pieces:**` line, not in `<run>/failed.txt`, and every id on its `after:` is on the line.
   b. Start one builder per ready piece, all at once, attempt 1. Wait until every one has returned.
   c. For each piece from b, run `tail -n 1 "<run>/build-<id>-1.md"`. If that is a miss, start that builder once more with the same brief, wait for it, and run the `tail` again. `RESULT: BUILT`: the piece gets a critic. Anything else, `RESULT: STOPPED` or a second miss, makes the piece failed: run `echo <id> >> "<run>/failed.txt"`, and start nothing more for it. Then start one critic for each piece that printed `RESULT: BUILT`, attempt 1, one at a time: wait for each to return before starting the next.
   d. For each piece that had a critic, run `tail -n 1 "<run>/critic-<id>-1.md"`. If that is a miss, start that critic once more with the same brief, wait for it, and run the `tail` again. `VERDICT: PASS`: add the id to the spec's `**Built pieces:**` line, after `, ` (replacing `none` the first time). Anything else, `VERDICT: FAIL` or a second miss, is a fail.
   e. For each piece with a fail, one piece at a time:
      - Start one builder, attempt 2, and wait for it. Check it as c does. A piece that does not print `RESULT: BUILT` is failed, as in c, and gets no critic.
      - Start one critic, attempt 2, and wait for it. Check it as d does. `VERDICT: PASS`: add the id to the line. Anything else makes the piece failed: run `echo <id> >> "<run>/failed.txt"`.
      Leave a failed piece's files as they are and send it to nobody else.
7. **Audit.** Start one auditor and wait until it has returned. Run `tail -n 1 "<run>/report.md"`. If that is a miss, start the auditor once more with the same brief, wait for it, and run the `tail` again. A line starting `**Built pieces:**` goes to step 8. Anything else is a second miss: do what Missed report says, and stop.
8. **Relay.** Run `tail -n 1 "<run>/report.md"` and, with your edit tool, replace the `**Built pieces:**` line in the spec with that line. Then run `cat "<run>/report.md"`. Your reply is that output, word for word, then one line: `Report file: <run>/report.md`. Add no summary, no correction, and no next step of your own. Stop.

## Never

- Read a builder's or a critic's report beyond its one `tail -n 1`, or tell a subagent what another one said.
- Fix, revert, or judge anything yourself, or run a builder's or critic's commands yourself. A piece the critic fails twice is the auditor's to report.
- Start a critic while a builder is running, or a builder while a critic is running.
