<h1 align="center">Workflow skills</h1>

**Agree the work before the agent builds it, and never let it review its own code.**

These are the house routines for any agent that loads [Agent Skills](https://agentskills.io/specification) (`SKILL.md` folders). `/spec` writes the work you agreed into one file, `/go` builds it through subagents and leaves it uncommitted, and `/cycle` has fresh subagents review it, fix it, and commit it. Around them, `/waypoint` carries a session across a compaction, `/slop-hunt` finds weight the code hasn't earned, and `/readme` keeps a README true to the code. Each skill carries the procedure and the doctrine rules it needs, generated into its own folder, and `AGENTS.md` holds the shared rules, in every session and between routines.

It does the job of typing "usual process; subagents, don't commit, then we'll cycle" at the end of every conversation, without the agent improvising what you meant. The agent commits only when you say "commit" or run `/cycle`, and pushes, tags, or deploys only when you name that action. That's a rule the agent follows, not a lock on git.

## Prerequisites

- macOS, Linux, or WSL on Windows: the install and the routines use POSIX `sh`, symlinks, and `openssl`.
- git 2.31 or later: the routines use `git rev-parse --path-format`.
- An agent that loads `SKILL.md` skills and can run shell commands and edit files.
- Subagents, for `/go`, `/cycle`, `/slop-hunt`, and `/spec`'s cold read. Without them, `/cycle` and `/slop-hunt` stop and say so, `/spec` reports its cold read as skipped, and `/go` stops before building.
- [ast-grep](https://ast-grep.github.io/) is optional: `AGENTS.md` bans writing files with `sed`, and agents use `ast-grep --rewrite` for the same change across many code files (`brew install ast-grep`, `npm i -g @ast-grep/cli`, or `cargo install ast-grep`). It doesn't parse Markdown, so prose files, and every file when it isn't installed, are edited one at a time.
- A per-project memory directory is optional: `/waypoint` keeps waypoints in your agent's per-project memory directory if it has one, else in the main checkout's `.plans/waypoints/`.
- [jq](https://jqlang.org/), for the after-compaction hook in Claude Code and Codex, and for reading `/cycle`'s mutation report. Mutation testing makes small deliberate changes to code, called mutants, to check the tests; a surviving mutant is one no test noticed, and a mutation report is the JSON file that records the results. See the mutation-command bullet under [Each repo](INSTALL.md#each-repo) for its required format (`brew install jq`; macOS 15 and later ship it). The install says so when it's missing.

## Install

Clone the repo somewhere it will stay, because every link the install makes points into the clone:

```bash
git clone https://github.com/maxanstey-meridian/workflow-skills ~/src/workflow-skills
```

Then, for each agent you use, run the install with its name:

```bash
sh ~/src/workflow-skills/install.sh <agent>
```

It links the workflow skills (`spec`, `go`, `cycle`, `waypoint`, `slop-hunt`, `readme`, and `meridian`) and the shared rules, `AGENTS.md`, into the places that agent reads, so `git pull` updates them. Your own personal rules keep loading beside the shared ones. Anything left for you to do prints under "To finish", followed by how to check the install.

[`INSTALL.md`](INSTALL.md) has the rest: what the install will and won't touch, a section for each agent (where its skills and rules go, how to call a skill, and how to check the install), what to put in each repo, and how to update or uninstall.

## The skills

| Skill | What it does | Never |
|---|---|---|
| `/spec` | Writes the agreed work into one spec file. | Edits code or commits. |
| `/go <spec path>` | Builds the spec through subagents and leaves it uncommitted. | Commits or pushes. |
| `/cycle [<spec path>] [full \| diff]` | Reviews all uncommitted work with fresh subagents, fixes it, and commits it. | Pushes, tags, or publishes. |
| `/waypoint` | Saves the session's state to a note before you compact or step away. | Commits or pushes. |
| `/slop-hunt` | Hunts the repo for weight the code hasn't earned, and ranks what it finds. | Edits code or runs builds. |
| `/readme [path]` | Brings the README up to date with the code, or writes one. | Commits or pushes. |
| `meridian` | The house doctrine the routines hold work to, as a library of rules. | |

**`/spec`** writes `.plans/spec-<slug>.md`, which `/go` builds from and `/cycle` reviews against. It runs no build and no gate.

**`/go`** gives each piece of the spec a builder, then a critic that checks the piece against the spec, with one retry. A fresh auditor then runs the spec's Done-means checks and writes the report, which the session relays as written. It stops before building when subagents are unavailable or the spec still has open asks. It never runs `/cycle`'s review or the full gate.

**`/cycle`** reviews, commits, fixes, re-reviews, and commits again, for three rounds at most. A critic checks each round's fixes against their findings. The full gate then runs once, and a fresh auditor reconciles every finding, runs one mutation run when the repo has a command for it, and writes the report. With a spec, it also checks the work against that spec. `diff` is the default.

**`/slop-hunt`** looks first for capabilities that cost more than they give users, then for hand-rolled machinery, silent failures, speculative abstraction, duplication, dead code, and test slop. Each finding comes with its replacement and what users would lose. It writes only inside `.plans/`, bar one line in `.git/info/exclude` when the repo doesn't ignore `.plans/`.

**`/readme`** covers what users can see changed since the README was last committed, moves it into the house shape and voice, and checks every command, path, count, and link against the repo.

**`meridian`** covers architecture, invariants, UI, testing, and tooling. Each rule is one file in one format: a title, a strength line with the rule in one sentence, a When line, and a Bad and Good pair. Where a spec leaves a UI's accessibility, formatting, or validation open, it follows the GOV.UK Design System and style guide, unless the repo's UI skill decides. [`CONTRIBUTING.md`](CONTRIBUTING.md) says how the rules reach the routines' subagents; after editing a rule, a list, or a role, run `task build` (or `sh scripts/build-roles.sh`). `task gate` is this repo's gate: it fails when the build refuses anything or a generated file was out of date.

`/go` and `/cycle` are yours to start. The skills tell the agent never to start them itself. They say so in prose rather than with `disable-model-invocation`: that flag takes the skill's description out of the agent's context, so it no longer recognises "then we'll go" as the routine and improvises one instead. This README writes each skill as `/name`; your agent's section in [`INSTALL.md`](INSTALL.md) says how yours calls one.

## The routine in practice

Talk the work through, then run `/spec` and answer its asks. Run `/go <spec path>` with the path `/spec` reports, review the diff yourself, and run `/cycle <spec path> [full | diff]`. For work that has no spec, run `/cycle [full | diff]`. Run `/waypoint` before you compact a session (your agent's compact or summarise command, which shrinks the conversation to a summary) or step away.

A full run can use plan quota or API spend and can take as long as the repo's gate. Which model each kind of subagent runs on is yours to set: see "Subagent models" in `AGENTS.md`.

At the end, agents that didn't write the work (a critic for every `/go` piece and every `/cycle` round of fixes, and `/cycle`'s reviewers) have checked it, an auditor that didn't run the routine has sorted what's left and written each report, the work is committed with each round of fixes in a commit of its own, and the repo's gate has run once over the final result (after a gate fix, only its failing checks rerun).

## After a compaction

`AGENTS.md` tells the agent to read the shared rules, the house Laws, and its waypoint after a compaction. In 40 compactions that carried the rule, it never did.

[`hooks/after-compaction.sh`](hooks/after-compaction.sh) makes it. After a compaction, it puts the session's waypoint back into context, headed by a `STOP. NON-NEGOTIABLE` list of files to read in full: `AGENTS.md`, the house Laws (`skills/meridian/references/rules/core/laws.md`, `core/backend-laws.md`, and `core/frontend-laws.md`), and whatever the waypoint's "Read first" line names. If there's no waypoint, it tells you.

The shouting is deliberate. Claude Code's docs say current models don't need IMPORTANT or ALL CAPS, but plainer wording, and the hook on its own, were read past. "In full, even if it's already in your context" is there because the agent then read 5 lines of `AGENTS.md` and called it done.

A waypoint written mid-routine names that routine's `SKILL.md`, so it's read again too, and records that you started it. That record is what lets a resumed `/cycle` keep committing: with no waypoint, the agent stops and asks.

Claude Code and Codex can run it; their sections in [`INSTALL.md`](INSTALL.md) say how. The other agents have no hook that runs after a compaction, so for them the rule in `AGENTS.md` is all there is.

## Also in the box

- [`AGENTS.md`](AGENTS.md): the shared rules, loaded in every project beside your own personal rules, within the limits your agent's section in [`INSTALL.md`](INSTALL.md) gives. They say what the approval words mean ("commit" commits, "push" pushes, and nothing more), that "we'll cycle" authorises nothing, the report shape, and to read AGENTS.md, the house Laws, and the waypoint back after a compaction. The skills hold their own steps and take the shared definitions (Reports, Routines) from it, and every subagent brief stays self-contained. Your preferences go in your personal rules, not here; change `AGENTS.md` through this repo.
- [`hooks/after-compaction.sh`](hooks/after-compaction.sh): puts the session's waypoint back after a compaction, in agents that can run a hook then. See [After a compaction](#after-a-compaction).
- [`examples/`](examples/): one-shot runs, a small model given these skills and a single prompt with no `/spec`, `/go`, or `/cycle`, its output kept as built, unreviewed and unedited. They show what the doctrine alone gets you, and each README gives the prompt and the cost. They are what `/spec`, `/go`, and `/cycle` are for.
  - [Room booking, .NET 10 and Nuxt 4](examples/room-booking-dotnet/), by GLM 5.3 Flash.
- [Plumb](https://github.com/maxanstey-meridian/plumb): checks a repo against the Meridian doctrine. It's optional: the `meridian` skill, `/cycle`'s doctrine reviewer, and `/slop-hunt` run it when a repo uses it.
