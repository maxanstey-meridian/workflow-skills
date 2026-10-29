# Workflow skills

The house routines for any agent that loads [Agent Skills](https://agentskills.io/specification) (`SKILL.md` folders): spec the work, build it, then review and commit it, plus the Meridian doctrine they check against. `AGENTS.md` holds the shared rules that apply between routines.

| Skill | Arguments | What it does | What it never does |
|---|---|---|---|
| `/spec` | `[name \| spec path] [quick]` | Turns the agreed work into one `.plans/spec-<name>.md` that `/go` builds from and `/cycle` reviews against. `quick` skips the cold read (a fresh subagent reading the spec for gaps). | Edits code, runs builds or the gate, or commits. |
| `/go` | `[spec path \| items \| task] [solo]` | Builds the agreed work through subagents (or in this session with `solo`), checks it narrowly, and leaves it uncommitted. | Commits, pushes, runs `/cycle`'s review, or runs the full gate. |
| `/cycle` | `[push] [tag <version>] [publish] [review-only] [light \| fanout] [diff]` | Reviews all uncommitted work with fresh subagents, commits, fixes, re-reviews, commits again, and runs the full gate once. | Pushes or tags unless given `push` or `tag`. Publishes: `publish` only prints the command for you to run. |
| `/waypoint` | none | Saves the session's state to a note before you compact or step away. | Commits, pushes, or tidies. |
| `/where` | none | Answers "where are we?": the phase, done, doing, next, what waits on you, and the branch, from the waypoint and live git state. | Writes, commits, or tidies. |
| `/slop-hunt` | `<path> [<path>…] [spec]` | Hunts for code heavier than it needs to be (hand-rolled machinery, over-engineering, duplication, and dead code) and ranks it with replacements and lines saved. With `spec`, writes a spec `/go` can build. | Edits anything outside `.plans/`. |
| `meridian` | (loaded by the skills) | The house doctrine (architecture, invariants, testing, and tooling) that the other skills load and send their subagents to read. | |

`/go` and `/cycle` are yours to start. The skills tell the agent never to start them itself. This README writes each skill as `/name`; your agent's section under [Install](#install) says how yours calls one.

## The routine in practice

Talk the work through, then run `/spec [name]` and answer its asks. Run `/go <spec path>`, review the diff yourself, and run `/cycle` (`/cycle push` to push too). Run `/waypoint` before you compact a session (your agent's compact or summarise command, which shrinks the conversation to a summary) or step away, and `/where` when you come back to one.

`/go` starts one subagent per piece of the spec. `/cycle` starts a reviewer per slice plus two doctrine-compliance passes (backend and frontend), or one reviewer when the change is small, then a fixer per slice, re-reviewers, and one full gate run. That uses plan quota or API spend, and a cycle can take as long as the repo's gate.

## Prerequisites

- macOS, Linux, or WSL on Windows: the install and the routines use POSIX `sh`, symlinks, and `openssl`.
- git 2.31 or later: the routines use `git rev-parse --path-format`.
- An agent that loads `SKILL.md` skills and can run shell commands and edit files.
- Subagents, for `/go`, `/cycle`, and `/spec`'s cold read. Without them, `/cycle` stops and says so, `/spec` skips its cold read, and `/go` builds in the session as with `solo`.
- A per-project memory directory is optional: `/waypoint` and `/where` keep waypoints in your agent's per-project memory directory if it has one, else in the main checkout's `.plans/waypoints/`.

## Install

Clone the repo somewhere it will stay, because every link the install makes points into the clone:

```bash
git clone https://github.com/maxanstey-meridian/workflow-skills ~/src/workflow-skills
```

Then, for each agent you use, run the install with its name:

```bash
sh ~/src/workflow-skills/install.sh <agent>
```

It links all seven skills and the shared rules, `AGENTS.md`, into the places that agent reads, so `git pull` updates them. Your own personal rules keep loading beside the shared ones. Anything left for you to do prints under "To finish", followed by how to check the install.

The install never replaces a file, a folder, or a link of yours, and never edits a config file. It replaces a broken link only when it pointed into this clone. It says what it skipped and why, and exits non-zero when it skipped something you asked for. A link of yours that already leads to this repo, through another link, say, counts as installed. Rerunning it is safe. A copy run from outside the clone changes nothing.

Install the seven skills together: `/go`, `/cycle`, and `/slop-hunt` read the spec and go skills' files by name. If a folder the install links into, or one an agent reads beside it, already holds a skill called `spec`, `go`, `cycle`, `where`, `waypoint`, `slop-hunt`, or `meridian`, the install skips that one and names the folder; rename yours and rerun.

### Claude Code

```bash
sh ~/src/workflow-skills/install.sh claude-code
```

- **Skills:** linked into `~/.claude/skills`. Claude Code doesn't read `~/.agents/skills`.
- **Rules:** linked as `~/.claude/rules/workflow-skills.md`. Every `.md` file in `~/.claude/rules/` loads beside your `~/.claude/CLAUDE.md`, so your own rules stay where they are. If you already have a `workflow-skills.md` there, rename yours and rerun.
- **Call a skill:** `/name`.
- **Check:** in a new session, `/skills` lists the seven skills, and `/context` lists the rules file under Memory files, beside your `CLAUDE.md`.
- Cowork desktop sessions load neither: they skip personal skills, and linked rules that point outside the working folder. Cloud sessions have no `~/.claude` at all. The skills reach both only when they're enabled on your claude.ai account.

### Codex

This covers the Codex CLI, the IDE extension, and Codex in the ChatGPT desktop app.

```bash
sh ~/src/workflow-skills/install.sh codex
```

- **Skills:** linked into `~/.agents/skills`. Codex also reads `$CODEX_HOME/skills` (`~/.codex/skills` by default), and the install skips a skill of yours there with the same name.
- **Rules:** Codex loads exactly one global rules file and can't import another, so the install links this repo's `AGENTS.md` as `~/.codex/AGENTS.md`. Your own rules go in `developer_instructions`, which loads beside it. Put it at the very top of `~/.codex/config.toml`, before any `[section]` line: after one, the key belongs to that section. Under `[features]` Codex refuses to start, under `[profiles.<name>]` it applies to that profile only, and elsewhere Codex ignores it. The `'''` quotes keep a backslash in a rule from breaking the file.

  ```toml
  developer_instructions = '''
  - Your own rules, one per line.
  '''
  ```

  Never edit `~/.codex/AGENTS.md` once it's linked: an edit there changes the clone. If you already have a `~/.codex/AGENTS.md` of your own, a file or a link to your dotfiles (working or broken), the install leaves it alone and says so: move its lines into `developer_instructions`, remove it, and rerun. The same goes for `~/.codex/AGENTS.override.md`, which Codex reads in place of `AGENTS.md` while it holds anything but blank lines.
- **Call a skill:** `$name`, or pick it from `/skills`.
- **Check:** start a new session: `/skills` lists the seven skills, `/status` lists `~/.codex/AGENTS.md` on its `Agents.md` row, and asking "List the instruction sources you loaded" names your `developer_instructions`.
- Codex's default sandbox keeps `.git` read-only, so it asks before `/cycle` commits and before a routine adds `.plans/` to `.git/info/exclude`. Approve those, or allow `.git` writes in your sandbox settings.

### Cursor

```bash
sh ~/src/workflow-skills/install.sh cursor
```

- **Skills:** linked into `~/.agents/skills`, not `~/.cursor/skills`, which Cursor's "Sync Skills for Cloud Agents" moves into synced storage, where `git pull` no longer reaches. Cursor also reads `~/.claude/skills` and `~/.codex/skills`, so if you install for Claude Code too, Cursor finds each skill twice; the Cursor CLI lists each once. Linked skill folders need Cursor CLI 2026.06.22 or later.
- **Rules:** linked as `~/.cursor/rules/workflow-skills.mdc`. `AGENTS.md` starts with `alwaysApply: true` frontmatter, so Cursor loads it on every request, beside your own User Rules and rule files. `cursor-agent` reads it only in projects under your home folder. If you already have a `workflow-skills.mdc` there, rename yours and rerun. If you pasted `AGENTS.md` into Customize → Rules → User Rules for an earlier install, remove it: the install reminds you once.
- **Call a skill:** type `/` in Agent chat and pick it.
- **Check:** in a new Agent chat or `cursor-agent` session, `/` lists the seven skills; in the IDE, Customize → Rules lists `workflow-skills`.

### Copilot CLI

```bash
sh ~/src/workflow-skills/install.sh copilot
```

- **Skills:** linked into `~/.copilot/skills`, or `$COPILOT_HOME/skills` when you've set `COPILOT_HOME`. Copilot also reads `~/.agents/skills` unless `COPILOT_HOME` is set; the install checks both for a skill of yours with the same name.
- **Rules:** linked as `~/.copilot/instructions/workflow-skills.instructions.md` (or in `$COPILOT_HOME/instructions`), which loads in every repo beside your own `~/.copilot/copilot-instructions.md` (or `$COPILOT_HOME/copilot-instructions.md`). If you already have a `workflow-skills.instructions.md` there, rename yours and rerun. Changes to instruction files apply in a new or resumed session. If your shell profile sets `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` to the clone from an earlier install, the install says so: remove the clone from it, or the rules load twice.
- **Call a skill:** `/name`.
- **Check:** start a new or resumed `copilot` session: `/skills list` shows the seven skills, and `/instructions` lists `workflow-skills.instructions.md` beside your `~/.copilot/copilot-instructions.md`.

### OpenCode

This needs OpenCode 2 or later.

```bash
sh ~/src/workflow-skills/install.sh opencode
```

- **Skills:** linked into `~/.agents/skills`.
- **Rules:** list the clone's `AGENTS.md` under `instructions` in `opencode.json` in OpenCode's config folder: `$OPENCODE_CONFIG_DIR`, else `$XDG_CONFIG_HOME/opencode`, else `~/.config/opencode`. If the file doesn't exist yet, create it with just this; if it does, add the `instructions` line to it. OpenCode reloads the file when it changes.

  ```json
  { "instructions": ["~/src/workflow-skills/AGENTS.md"] }
  ```

  Your own rules stay in `AGENTS.md` in that folder.
- **Call a skill:** mention it in your prompt as `@name`.
- **Check:** in a new session, ask "Which skills can you load, and which instruction files did you load?": it names the seven skills, the clone's `AGENTS.md`, and your own.

### Gemini CLI

Gemini CLI is for Gemini Code Assist Standard and Enterprise accounts, and for paid Gemini API key and Gemini Enterprise Agent Platform key users. Personal Google accounts moved to Antigravity CLI in June 2026: see [Antigravity CLI](#antigravity-cli).

```bash
sh ~/src/workflow-skills/install.sh gemini
```

- **Skills:** linked into `~/.agents/skills`.
- **Rules:** linked as `~/.gemini/AGENTS.md`. Gemini loads it once `~/.gemini/settings.json` lists it after `GEMINI.md`. The order matters: Gemini saves the memories you ask it to keep into the first file listed, which must be your own. If the file doesn't exist yet, create it with just this; if it does, set `fileName` inside its `context` block.

  ```json
  { "context": { "fileName": ["GEMINI.md", "AGENTS.md"] } }
  ```

  Your own rules stay in `~/.gemini/GEMINI.md`; if you already keep them in `~/.gemini/AGENTS.md`, the install says so: move them into `GEMINI.md`, remove it, and rerun. Gemini then also loads a repo's `AGENTS.md`, which is what it's for, once you trust the repo's folder. If you installed for Antigravity CLI first, the install removes its rules link, because Antigravity CLI also loads `~/.gemini/AGENTS.md`. An `@` import in `GEMINI.md` won't do instead: Gemini refuses imports from outside `~/.gemini`.
- **Call a skill:** `/name`. Gemini asks before it starts a skill by itself.
- **Check:** `/skills list` shows the seven skills, and `/memory list` names `~/.gemini/GEMINI.md` and `~/.gemini/AGENTS.md`.

### Antigravity CLI

```bash
sh ~/src/workflow-skills/install.sh antigravity
```

- **Skills:** linked into `~/.gemini/antigravity-cli/skills`.
- **Rules:** linked as `~/.gemini/antigravity-cli/rules/workflow-skills.md`, which loads beside your own rules; if `~/.gemini/AGENTS.md` already leads to the clone (from a Gemini install), the install uses that instead. If you already have a `workflow-skills.md` there, rename yours and rerun.
- **Call a skill:** `/name`.
- **Check:** start a new session: `/skills` lists the seven skills, and `/context` lists `~/.gemini/antigravity-cli/rules/workflow-skills.md` under System files, or `~/.gemini/AGENTS.md` when the install used that.
- Checked against Antigravity's docs only, not in a live session.

### Other agent

```bash
sh ~/src/workflow-skills/install.sh <skills folder> [<rules file>]
```

Give the folders as paths (`~/.myagent/skills`, not a bare name).

- **Skills:** many agents read `~/.agents/skills`; one that doesn't names its own folder in its docs, usually `~/.<agent>/skills`.
- **Rules:** it depends on how your agent keeps global rules:
  - **A rules folder where every `.md` file loads:** pass a new file in it, such as `~/.<agent>/rules/workflow-skills.md`. `AGENTS.md` starts with Cursor's `alwaysApply: true` frontmatter; check that your agent loads a file that has some.
  - **A setting that lists extra instruction files, or a personal rules file that can import one:** point it at the clone's `AGENTS.md`, and leave the rules file off the install.
  - **One personal rules file and nothing else:** if the agent has another place for your own rules, link the shared file there and move yours, as for Codex. If it has none, the shared rules can only go in as a copy you update by hand.
  - **A settings screen only:** paste `AGENTS.md` there. It's a copy, so paste it again after a pull that changes it.
- **Check:** start a new session and ask the agent which skills and instruction files it loaded.

### Update and uninstall

- **Update:** run `git pull && sh install.sh <agent>` in the clone. The links follow the pull, and the rerun links new skills and removes links to skills that are gone. Before you move the clone, run `sh install.sh uninstall`, then install from the new place: after a move, the old links point at nothing, and the install can't tell them from broken links of yours, so neither a rerun nor an uninstall from the new place removes them.
- **Uninstall:** `sh install.sh uninstall` removes every link into the clone from the folders above; add any folder or file you passed to the "Other agent" form, and set `CODEX_HOME` or `COPILOT_HOME` as you did for the install. It leaves the clone and your config files alone, and lists what you may have added by hand: OpenCode's `instructions` entry and Gemini's `AGENTS.md` in `context.fileName`, and, from an earlier install, Cursor's pasted User Rules and `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` in your shell profile.

## The shared rules file

The skills hold every rule they need while they run. `AGENTS.md` covers the time between routines: what the approval words mean ("commit" commits, "push" pushes, and nothing more), that "we'll cycle" authorises nothing, the report shape in ordinary conversation, and reading the waypoint back after a compaction.

Installed as your agent's section says, it loads in every project beside your own personal rules, within the limits that section gives. Your preferences go in those, not in `AGENTS.md`. Change `AGENTS.md` through this repo.

## What each repo provides

`/spec`, `/go`, `/cycle`, and `/slop-hunt` read the repo's `AGENTS.md`, or, when it has none, the agent instructions file in the repo root (such as `CLAUDE.md` or `GEMINI.md`). Put these there:

- the full gate command;
- the targeted test, format, lint, and typecheck commands;
- the contract regeneration and coverage commands, if any;
- the UI skill, if any;
- the paths never to commit;
- how to run the app on spare ports for a check.

Claude Code skips a repo's `AGENTS.md` when the repo also has a `CLAUDE.md` or a `CLAUDE.local.md`, so in such a repo, add the line `@AGENTS.md` to `CLAUDE.md`. Reading `AGENTS.md` needs Claude Code 2.1.277 or later.

The skills keep their working files in the main checkout's `.plans/`, and add `.plans/` to `.git/info/exclude` when the repo doesn't ignore it.

## Plumb

[Plumb](https://github.com/maxanstey-meridian/plumb) checks a repo against the Meridian doctrine. It's optional: the `meridian` skill and `/cycle`'s reviewers run it when a repo uses it.
