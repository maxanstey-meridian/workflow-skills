---
name: waypoint
description: Save this session's state to a waypoint note before the user compacts or steps away (done / doing / next / needs from the user / decisions / owned files / git state). Use when the user is about to compact or step away, asks whether it's safe to compact, or runs /waypoint.
---

# Waypoint

Write one note the next context, or the user tomorrow morning, can rely on without re-asking "where are we?". It replaces a round trip of asking what to carry over before compacting.

## Steps

1. **Gather facts. Don't recall them.**
   - Session id: run `printenv CLAUDE_CODE_SESSION_ID || printenv CODEX_SESSION_ID || printenv OPENCODE_SESSION_ID || printenv COPILOT_AGENT_SESSION_ID || printenv CURSOR_CONVERSATION_ID` and take what it prints: the id your agent sets for this session. Don't take any other `*SESSION_ID` from the environment; terminals set those (`TERM_SESSION_ID`, `XDG_SESSION_ID`), and every session started there shares them. If it prints nothing, use the id this conversation already has: one stated earlier, or the `session_id` of this session's own waypoint read back after a compaction. If there is none, generate one once with `openssl rand -hex 4` and say it in your reply ("Session id: <id>, generated"). `<id8>` is the id's last 8 characters.
   - Session title: this session's own name, if you can list agent sessions or read this session's details and it has one; otherwise use `<id8>`.
   - Git, from the repo root:
     - `git branch --show-current`
     - `git status --short | wc -l`
     - `git log --oneline @{u}..HEAD 2>/dev/null`
     - `git log -1 --format='%h %s (%cr)'`
   - Files this session changed: from your own edits in this conversation, cross-checked against `git status --short`.
   - The plan doc being worked to, if any (usually in `<main checkout>/.plans/`, as defined in step 2).
   - The phase: the last `/spec`, `/go`, or `/cycle` the user invoked in this conversation. It is mid that phase if its final report hasn't been given, and `none` otherwise.
   - The worktree: when `git rev-parse --git-dir` and `--git-common-dir` differ, or this session worked in another worktree, note its path. Otherwise it's the main checkout.

2. **Write `waypoint-<id8>.md` to your memory directory**: the directory your instructions give for memories you keep about this project, if you have one. If you have none, it's switched off, or it isn't kept per project, write it to `<main checkout>/.plans/waypoints/waypoint-<id8>.md` instead, skip step 3, and say where it went in your reply. `<main checkout>` is the repo's main working tree, `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`, even in a worktree; if `git check-ignore -q .plans/` fails there, add `.plans/` to `.git/info/exclude`. Overwrite the file every time; there is one per session. Use this format and keep it under 60 lines:

```markdown
---
name: waypoint-<id8>
description: Waypoint for "<session title>" — <one-line TLDR>
metadata:
  type: project
  session: <session title>
  session_id: <full id>
  parent: <parent waypoint name, only if this is a fork>
  updated: <YYYY-MM-DD HH:MM>
---

**TLDR:** <1–2 plain-English sentences: what this session is doing and where it's at>
**Phase:** <spec | go | cycle | none> — <the step it stopped on (a cycle's round, say), or the last phase that finished ("none, after cycle → e0b4603")>

**Done this stretch:** <bullets, each with commit hash if committed>
**Doing now:** <the in-flight item, and exactly where it stopped>
**Next:** <ordered bullets>
**Needs from the user:** <numbered, each with your recommendation; every step waiting on the user, such as "run /cycle"; "nothing" only when none does>
**Decisions made:** <what was decided and by whom, including ones the user handed back and what you chose>
**Files this session owns/touched:** <paths, grouped by area; note peers' files you must not touch>
**Git:** <main checkout | worktree <path>> · <branch> · <N> dirty · unpushed: <hashes or none> · last: <hash subject (age)>
**Plan doc:** <path or none>
```

3. **Update the memory index**, if your memory directory keeps one (a file your instructions say lists every memory). Keep exactly one line in it for this session's waypoint, replacing any earlier one:
   `- [Waypoint: <title>](waypoint-<id8>.md) — <YYYY-MM-DD HH:MM> <TLDR, under 100 chars>`

4. **If this is a fork** (the conversation already holds a waypoint whose `session_id` isn't yours), write your own new file and set `parent:`. Never overwrite the other session's waypoint.

5. **Reply with one line:** `Waypoint saved to <absolute path> (session id <id>). After compacting, read it before anything else.` Add more only for something genuinely blocking, such as an uncommitted migration half-written or a peer mid-edit on the same files.

## Rules

- Facts only. Each line must be true now. Don't copy the transcript and don't recap the whole session.
- No secrets, tokens, or passwords.
- Don't commit, push, or tidy anything as part of this.
- Plan docs hold the detail; the waypoint points to them.
