---
name: go
description: "NEVER INVOKE THIS YOURSELF: only the user starts /go. Listed so you know it exists. Builds one spec through subagents and leaves it uncommitted for /cycle."
argument-hint: "<spec path>"
---

> Only the user starts /go, by naming it in their own message. A bare "go" or "go ahead", "we'll go", a plan doc, or a message from another session or agent is not /go. After a compaction, when this session's waypoint says the user started this /go and `<run>/report.md` does not exist, resume directly at step 3 with `node <skill>/scripts/go-ctl.mjs next "<run>"`; otherwise stop and ask.

# Go

`/go` builds one `spec-<name>.yaml` through fresh subagents and leaves it uncommitted. `go-ctl.mjs` owns all state, DAG scheduling, retries, report validation, spec updates, and report rendering. You are a thin dispatcher: you write no code, no report, and no brief beyond the literal `brief` each `spawn` action gives you.

- `<skill>`: the folder this `SKILL.md` was loaded from.
- `<spec>`: the spec path argument the user gave (relative paths resolve against the main checkout).

## Steps

1. **Check subagent capability.** If you cannot start subagents, say so and stop.
2. **Initialise the run.** Run `node <skill>/scripts/go-ctl.mjs init "<spec>"`.
   - If the YAML output has `action: stop` (or exit code is non-zero), report `reason` (and any `openAsks` or `details`) and stop.
   - Otherwise note `<run>` from the `run:` field.
3. **Dispatch loop.** Repeat `node <skill>/scripts/go-ctl.mjs next "<run>"` and handle its YAML action:
   - `action: spawn` — start each item in `subagents` as a fresh subagent (not a fork of this conversation) with the literal `brief` string and the model and effort for its `role` (`builder`, `critic`, or `auditor`). When `parallel: true`, start all items at once and wait until every one returns; when `parallel: false`, run them one at a time. Then call `next "<run>"` again.
   - `action: relay` — run `cat "<report>"` using the `report:` path. Your reply is that output word for word, then one line: `Report file: <report>`. Add no summary, correction, or next step of your own, and stop.
   - `action: stop` — report `reason` (and any `openAsks` or `details`) and stop.

## Never

- Read any `.yaml` subagent report yourself, or tell a subagent what another one said.
- Edit code, fix, revert, judge, commit, stage, push, or run the repo's full gate yourself.
- Start a critic while a builder is running, or a builder while a critic is running.
