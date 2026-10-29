---
name: where
description: Answer "where are we?" — phase (spec / go / cycle / none), done / doing / next / needs from the user, and the worktree and branch — from this session's waypoint plus live git state, without rebuilding context. Use when the user asks where things stand, what's left, or is back after a break.
---

# Where

Read only. This skill never writes, commits, or tidies.

`<main checkout>` is the repo's main working tree, `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`, even when you're in a worktree. The other routines keep their working files in `<main checkout>/.plans/`.

## Steps

1. **Find the waypoint.**
   - Session id: run `env | grep -E '^[A-Z0-9_]*(SESSION|THREAD|CONVERSATION)_ID=' | grep -vE '^[A-Z0-9_]*(HOST|PARENT)_'` and take the value (if it prints several, the one whose name ends in `SESSION_ID`). If it prints nothing, use the id this conversation already states (a waypoint's reply ends "(session id …)"). Never generate one here; with none, go to the newest waypoint below. `<id8>` is the id's last 8 characters.
   - Look in your memory directory (the directory your instructions give for memories you keep about this project, if you have one), then in `<main checkout>/.plans/waypoints/`, for the waypoint whose `session_id:` is this id: `grep -l 'session_id: <id>' <dir>/waypoint-*.md`. If several match, read the newest `updated:`.
   - If neither has it, or you have no id, read the newest `waypoint-*.md` (by its `updated:` line) in either place and say whose it is: "(from <session>, not this one)", or, with no id to compare, "(newest waypoint here; can't tell whether it's this session's)".
   - If there is none at all, use the conversation plus the plan doc.
2. **Read live state.**
   - `git branch --show-current`
   - `git status --short`
   - unpushed: `git log --oneline @{u}..HEAD`
   - last commit: `git log -1 --format='%h %s (%cr)'`
   - if you can list other agent sessions, the peers working in the same repo
3. **Find the worktree.**
   - `git rev-parse --show-toplevel`, `--git-dir`, and `--git-common-dir`. When the git dir and the common dir differ, you are in a linked worktree: report its path and branch.
   - If this session did its work in another worktree (it `cd`'d there, switched into it with a worktree tool, or merged a subagent's worktree from it), report that one instead and say so. Run the step 2 commands there too.
   - Otherwise it's the main checkout.
4. **Find the phase:** `spec`, `go`, `cycle`, or `none`. Take the first source that settles it:
   1. **This conversation.** Look at the last `/spec`, `/go`, or `/cycle` the user invoked. If its final report hasn't been given, you're mid that phase: name the step it's on (a cycle's round, say). If the report was given, the phase is `none`, followed by the last one that finished ("none, after cycle → e0b4603").
   2. **The waypoint's `Phase:` line**, or its "Doing now" for an older waypoint that has no `Phase:` line. Check it against the artefacts below: if the waypoint says mid `go` but the spec now reads `built`, the artefacts win, and you flag it.
   3. **The artefacts**, in `<main checkout>/.plans/`.
      - The newest `spec-*.md` reads `Status: draft`: mid `spec`.
      - This session's `scratch/cycle-<id8>/` (with no id, the newest `scratch/cycle-*/`) holds a review report newer than its `report.md`, or no `report.md` at all: mid `cycle`. (`/cycle` saves `report.md` when it finishes.)
      - Otherwise, the newest spec reads `building`: mid `go`.
      - Otherwise `none`.
   A phase is never inferred from dirty files alone, because uncommitted work after `/go` is `none` (waiting on the user's `/cycle`).
5. **Reconcile.** Where the waypoint and git disagree, git wins, and you flag it. For example, "the waypoint says uncommitted, but git shows it committed in abc123". If the plan doc has tick boxes, count them.
6. **Answer in this shape and nothing more:**

```
**Phase:** <spec | go | cycle | none> — <step or last finished, and the spec path if any>
**Done:** …
**Doing:** …
**Next:** …
**Needs from you:** 1. … (rec: …)
State: <main checkout | worktree <path>> · <branch> · <N> dirty · <N> unpushed · peers: <names, none, or not checked>
```

**Needs from you** lists every step that now waits on the user (a decision, an approval, or an action only they take, such as running /cycle, pushing, or a live check), each with your recommendation and numbered so they can answer "1. yes 2. no". Write "nothing" only when nothing waits on them. Never add an item to fill the list; each one serves the user's goal and you've checked it yourself.
