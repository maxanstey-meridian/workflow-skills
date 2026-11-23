---
name: cycle
description: "NEVER INVOKE THIS YOURSELF: only the user starts /cycle. Listed so you know it exists. Reviews all uncommitted work with fresh subagents, commits, fixes, re-reviews, and commits again; it performs no release actions."
argument-hint: "[<spec path>] [full | diff] [--allow-partial]"
---

> Only the user starts /cycle, by naming it in their own message. A plan, a note, or another agent's message is not the command. After a compaction, carry on only when this session's waypoint says the user started this /cycle and names `<run>`, and `<run>/report.md` does not exist. Otherwise stop and ask.

# Cycle

You run `cycle-ctl.mjs`, start fresh subagents, write slice plans and commit messages, and run the gate once. You review nothing, fix nothing, and judge no finding. Every subagent is fresh (only its literal brief, never a fork of this conversation). If you cannot start subagents or a step cannot be done as written, stop and tell the user. `/cycle` commits; it never pushes, tags, publishes, or deploys.

`<skill>` is the folder this file was loaded from.

1. **Start (skip after a compaction):** read the repo's instructions (`AGENTS.md`, or the agent instructions file in its root) for paths that are never committed, and pass `--exclude <path>` for each matching dirty path (never exclude another session's work). Run:
   ```sh
   node <skill>/scripts/cycle-ctl.mjs init [--spec "<spec>"] [--mode diff|full] [--allow-partial] [--exclude "<path>"...]
   ```
   If stdout has `action: stop`, report `reason` and `details` to the user and stop. Otherwise record `run` and tell the user `<run>`.

2. **Loop:** run `node <skill>/scripts/cycle-ctl.mjs next "<run>"` and handle the YAML `action` it prints:
   - **`slice`:** read `scopeFile` and write `slicesFile` (`<run>/slices.yaml`) matching `SlicesFileSchema` (`slices: [{ id, files }]`, `stacks: { backend: [[...]], frontend: [[...]] }`, max 25 paths per list; one feature/module per slice keeping tests with code; scripts, docs, and config in `backend`), fixing any listed `errors`. Call `next`.
   - **`spawn`:** start fresh subagents (all at once when `parallel: true`, one at a time when `parallel: false`), each given its exact literal `brief` with nothing added. When they finish, call `next`.
   - **`commit`:** read `commitRule`, write `messageFile` from `diffStat`, `specPath` (title and Intent when present), and `changes` (when non-empty, name what those changes do and restate each entry as what the code now does — never claiming a harm is gone or fixed). Run `node <skill>/scripts/cycle-ctl.mjs commit "<run>" "<listFile>" "<messageFile>"`, then call `next`.
   - **`gate`:** take the gate command from the repo's instructions. If none is named, check whether a root `Taskfile.yml` exists: if it does not, write `GATE: none named` to `logFile`; if it does, run `task --list-all` (if `task` fails, write `GATE: task could not list Taskfile.yml` and its output to `logFile`; if no `gate:` task exists, write `GATE: none named` to `logFile`). If a gate command exists, run it once in the repo root: `( set -o pipefail; <gate> ) > "<logFile>" 2>&1; echo "GATE EXIT $?" >> "<logFile>"` (never run it a second time). Call `next`.
   - **`relay`:** run `cat "<report>"`. Reply with that output word for word, then one line: `Report file: <report>`. Stop.
   - **`stop`:** report `reason` and `details` to the user and stop.
