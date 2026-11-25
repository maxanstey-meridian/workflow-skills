---
name: slop-hunt
description: Use when the user runs /slop-hunt or asks for a slop hunt, slop review, anti-slop sweep, or over-engineering review. A read-only hunt over the current repository for weight the code hasn't earned, from whole capabilities down to dead code. Each finding is argued, says what users would lose, and is ranked by the weight it removes.
---
# Slop hunt

A hunt finds weight the code hasn't earned: code, machinery, or whole capabilities that cost more to own than they give users. `slop-ctl.mjs` owns scope collection, line counts, churn, mechanical finders, area validation, subagent scheduling, retries, report validation, and Markdown rendering. You dispatch, exclude obvious non-code data files if prompted, and split large repos into areas. Treat `slop-ctl.mjs` as a black box: never read its source or second-guess its phase order; always execute every `action` it emits (including every `spawn` item) and call `next`. You write only in `<run>` (never edit repo files, and run no restore, build, test, or gate). `/slop-hunt` takes no arguments; given one, say so and stop. If you cannot start subagents, say so and stop.

- `<skill>` is the folder this `SKILL.md` was loaded from.

After a compaction, when this session's waypoint names `<run>` and `<run>/report.md` does not exist, skip step 1 and resume at step 2 with `node <skill>/scripts/slop-ctl.mjs next "<run>"`.

## Steps

1. **Initialise the run.** Read the repo's instructions (`AGENTS.md`, or the agent instructions file in its root) for a check-mode lint command; if one is named, pass `--lint-cmd "<cmd>"`. Run:
   ```sh
   node <skill>/scripts/slop-ctl.mjs init [--lint-cmd "<cmd>"]
   ```
   - If stdout has `action: stop` (or exit code is non-zero), report `reason` (and any `details`) and stop.
   - Otherwise record `<run>` from `run:` and tell the user the path.

2. **Dispatch loop.** Repeat `node <skill>/scripts/slop-ctl.mjs next "<run>"` and handle its YAML `action`:
   - **`review-scope`:** inspect `oversized` and `topBiggest` (files over 2,000 lines). Exclude any hand-kept non-code data files (seeds, i18n, GeoJSON) via `node <skill>/scripts/slop-ctl.mjs exclude "<run>" <path>...`; when no non-code data files remain over 2,000 lines, run `node <skill>/scripts/slop-ctl.mjs exclude "<run>" --done`. Call `next`.
   - **`split`:** read `scopeFile` and `sizesFile`, then write `areasFile` (`<run>/areas.yaml`) as `areas: [{ name, files }]` (kebab-case names, one per module or package up to ~8,000 lines; split big modules by folder, merge small neighbours up to the limit, give a single file over the limit its own area, keep scripts/docs/config with the nearest module, and add `cross-cutting` for shared kernel and infrastructure files when there is more than one area), fixing any listed `errors`. Call `next`.
   - **`spawn`:** start each item in `subagents` as a fresh subagent (never a fork of this conversation) with its exact literal `brief` and the model and effort for its `role` (`design-reader`, `hunter`, `verifier`, or `reporter`). Launch all items at once when `parallel: true` (`slop-ctl.mjs` caps each batch at 8), or one at a time when `parallel: false`, and wait until every one finishes. Call `next`.
   - **`relay`:** run `cat "<report>"`. Your reply is that output word for word, then one line: `Report file: <report>`. Add no finding, ranking, or recommendation of your own, and stop.
   - **`stop`:** report `reason` and any `details` to the user and stop.
