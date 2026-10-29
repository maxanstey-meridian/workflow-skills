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

Only you start `/go` and `/cycle`. The agent sees them listed but never runs them itself. This README writes each skill as `/name`; your agent's section under [Install](#install) says how yours calls one.

## The routine in practice

Talk the work through, then run `/spec [name]` and answer its asks. Run `/go <spec path>`, review the diff yourself, and run `/cycle` (`/cycle push` to push too). Run `/waypoint` before you compact a session (your agent's compact or summarise command, which shrinks the conversation to a summary) or step away, and `/where` when you come back to one.

`/go` starts one subagent per piece of the spec. `/cycle` starts a reviewer per slice plus two doctrine-compliance passes (backend and frontend), or one reviewer when the change is small, then a fixer per slice, re-reviewers, and one full gate run. That uses plan quota or API spend, and a cycle can take as long as the repo's gate.

## Prerequisites

- macOS, Linux, or WSL on Windows: the install and the routines use POSIX `sh`, symlinks, and `openssl`.
- git.
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

The install never replaces a file, a folder, or a link of yours, and never edits a config file. It only replaces a broken link, and says so. It says what it skipped and why, and exits non-zero when it skipped something you asked for. A link of yours that already leads to this repo, through another link, say, counts as installed. Rerunning it is safe. A copy run from outside the clone changes nothing.

Install the seven skills together: `/go`, `/cycle`, and `/slop-hunt` read the spec and go skills' files by name. If you already have a skill called `spec`, `go`, `cycle`, `where`, `waypoint`, `slop-hunt`, or `meridian`, the install skips that one; rename yours and rerun before you use the routines.

### Claude Code

```bash
sh ~/src/workflow-skills/install.sh claude-code
```

- **Skills:** linked into `~/.claude/skills`. Claude Code doesn't read `~/.agents/skills`.
- **Rules:** linked as `~/.claude/rules/workflow-skills.md`. Every `.md` file in `~/.claude/rules/` loads beside your `~/.claude/CLAUDE.md`, so your own rules stay where they are. If you already have a `workflow-skills.md` there, rename yours and rerun.
- **Call a skill:** `/name`.
- **Check:** in a new session, `/skills` lists the seven skills, and `/context` lists the rules file under Memory files, beside your `CLAUDE.md`.
- Cowork desktop sessions and cloud sessions load neither: they skip personal skills, and linked rules that point outside the working folder.

### Codex

This covers the Codex CLI, the IDE extension, and the desktop app.

```bash
sh ~/src/workflow-skills/install.sh codex
```

- **Skills:** linked into `~/.agents/skills`. Codex also reads its legacy `~/.codex/skills` and lists a skill found in both twice, so the install skips any skill already linked there. To move off the legacy folder, remove those links there, then rerun the install.
- **Rules:** Codex loads exactly one global rules file and can't import another, so the install links this repo's `AGENTS.md` as `~/.codex/AGENTS.md`. Your own rules go in `developer_instructions`, which loads beside it. Put it at the very top of `~/.codex/config.toml`, before any `[section]` line: after one, TOML files it under that section and Codex ignores it. The `'''` quotes keep a backslash in a rule from breaking the file.

  ```toml
  developer_instructions = '''
  - Your own rules, one per line.
  '''
  ```

  Never edit `~/.codex/AGENTS.md` once it's linked: an edit there changes the clone. If you already have a `~/.codex/AGENTS.md` of your own, a file or a link to your dotfiles, the install leaves it alone and says so: move its lines into `developer_instructions`, remove it, and rerun. The same goes for `~/.codex/AGENTS.override.md`, which Codex reads in place of `AGENTS.md` while it exists.
- **Call a skill:** `$name`, or pick it from `/skills`.
- **Check:** in a new session, `/skills` lists the seven skills, and asking "List the instruction sources you loaded" names `~/.codex/AGENTS.md` and your developer instructions.
- Codex's default sandbox keeps `.git` read-only, so it asks before `/cycle` commits and before a routine adds `.plans/` to `.git/info/exclude`. Approve those, or allow `.git` writes in your sandbox settings.

### Cursor

```bash
sh ~/src/workflow-skills/install.sh cursor
```

- **Skills:** linked into `~/.agents/skills`, not `~/.cursor/skills`, which Cursor's "Sync Skills for Cloud Agents" moves into synced storage, where `git pull` no longer reaches. Cursor also reads `~/.claude/skills` and `~/.codex/skills`, so if you install for Claude Code too, Cursor finds each skill twice; its docs don't say whether it then lists them twice. Its docs also don't say whether it follows linked skill folders; its CLI changelog says its skills menu does from version 2026.06.22.
- **Rules:** Cursor keeps global rules only in its settings, so nothing on disk can keep them current. Paste `AGENTS.md` into Customize → Rules → User Rules, beside your own rules. After each `git pull`, run `git diff ORIG_HEAD -- AGENTS.md` in the clone; if it prints anything, paste the file again.
- **Call a skill:** type `/` in Agent chat and pick it.
- **Check:** `/` lists the seven skills, and Customize → Rules shows your User Rules.

### Copilot CLI

```bash
sh ~/src/workflow-skills/install.sh copilot
```

- **Skills:** linked into `~/.copilot/skills`, or `$COPILOT_HOME/skills` when you've set `COPILOT_HOME`.
- **Rules:** Copilot's instruction files can only import files inside the repo or an instructions folder, so the shared rules load through an environment variable. Add this line to your shell profile (`~/.zshrc` or `~/.bashrc`) and open a new terminal; if the variable is already set, add the clone's path after a comma:

  ```bash
  export COPILOT_CUSTOM_INSTRUCTIONS_DIRS="$HOME/src/workflow-skills"
  ```

  Your own rules stay in `~/.copilot/copilot-instructions.md` (or `$COPILOT_HOME/copilot-instructions.md`). Copilot doesn't pass these rules to the subagents it starts, only to the main session.
- **Call a skill:** `/name`.
- **Check:** `/skills list` shows the seven skills, and `/instructions` lists the clone's `AGENTS.md`.

### OpenCode

This needs OpenCode 2 or later.

```bash
sh ~/src/workflow-skills/install.sh opencode
```

- **Skills:** linked into `~/.agents/skills`.
- **Rules:** list the clone's `AGENTS.md` under `instructions` in `~/.config/opencode/opencode.json`. If the file doesn't exist yet, create it with just this; if it does, add the `instructions` line to it. OpenCode reloads the file when it changes.

  ```json
  { "instructions": ["~/src/workflow-skills/AGENTS.md"] }
  ```

  Your own rules stay in `~/.config/opencode/AGENTS.md`.
- **Call a skill:** mention it in your prompt as `@name`.
- **Check:** in a new session, ask "Which skills can you load, and which instruction files did you load?": it names the seven skills, the clone's `AGENTS.md`, and your own.

### Gemini CLI

Gemini CLI is for Gemini Code Assist Standard and Enterprise accounts, and for API-key users. Personal Google accounts moved to Antigravity CLI in June 2026: see [Antigravity CLI](#antigravity-cli).

```bash
sh ~/src/workflow-skills/install.sh gemini
```

- **Skills:** linked into `~/.agents/skills`.
- **Rules:** linked as `~/.gemini/AGENTS.md`. Gemini loads it once `~/.gemini/settings.json` lists it after `GEMINI.md`. The order matters: Gemini saves the memories you ask it to keep into the first file listed, which must be your own. If the file doesn't exist yet, create it with just this; if it does, set `fileName` inside its `context` block.

  ```json
  { "context": { "fileName": ["GEMINI.md", "AGENTS.md"] } }
  ```

  Your own rules stay in `~/.gemini/GEMINI.md`; if you already keep them in `~/.gemini/AGENTS.md`, the install says so: move them into `GEMINI.md`, remove it, and rerun. Gemini then also loads the `AGENTS.md` files in your repos, which is what they're for. An `@` import in `GEMINI.md` won't do instead: Gemini refuses imports from outside `~/.gemini`.
- **Call a skill:** `/name`. Gemini asks before it starts a skill by itself.
- **Check:** `/skills list` shows the seven skills, and `/memory list` names `~/.gemini/GEMINI.md` and `~/.gemini/AGENTS.md`.

### Antigravity CLI

```bash
sh ~/src/workflow-skills/install.sh antigravity
```

- **Skills:** linked into `~/.gemini/antigravity-cli/skills`.
- **Call a skill:** `/name`.
- **Rules:** linked as `~/.gemini/AGENTS.md`, which Antigravity CLI loads beside your own `~/.gemini/GEMINI.md`. If you already keep your rules in `~/.gemini/AGENTS.md`, the install says so: move them into `GEMINI.md`, remove it, and rerun.
- **Check:** in a new session, ask which skills and rules files it loaded.
- Checked against Antigravity's docs only, not in a live session.

### Other agent

```bash
sh ~/src/workflow-skills/install.sh <skills folder> [<rules file>]
```

Give the folders as paths (`~/.myagent/skills`, not a bare name).

- **Skills:** many agents read `~/.agents/skills`; one that doesn't names its own folder in its docs, usually `~/.<agent>/skills`.
- **Rules:** it depends on how your agent keeps global rules:
  - **A rules folder where every `.md` file loads:** pass a new file in it, such as `~/.<agent>/rules/workflow-skills.md`. Check the agent's docs first: some skip a rules file without frontmatter, and `AGENTS.md` has none.
  - **A setting that lists extra instruction files, or a personal rules file that can import one:** point it at the clone's `AGENTS.md`, and leave the rules file off the install.
  - **One personal rules file and nothing else:** if the agent has another place for your own rules, link the shared file there and move yours, as for Codex. If it has none, the shared rules can only go in as a copy you update by hand.
  - **A settings screen only:** paste `AGENTS.md`, as for Cursor.
- **Check:** start a new session and ask the agent which skills and instruction files it loaded.

### Update and uninstall

- **Update:** run `git pull && sh install.sh <agent>` in the clone. The links follow the pull, and the rerun links new skills and removes links to skills that are gone. On Cursor, check whether the rules need pasting again.
- **Uninstall:** `sh install.sh uninstall` removes every link into the clone from the folders above; add any folder or file you passed to the "Other agent" form, and set `CODEX_HOME` or `COPILOT_HOME` as you did for the install. It leaves the clone and your config files alone, and lists the lines you may have added by hand.

## The shared rules file

The skills hold every rule they need while they run. `AGENTS.md` covers the time between routines: what the approval words mean ("commit" commits, "push" pushes, and nothing more), that "we'll cycle" authorises nothing, the report shape in ordinary conversation, and reading the waypoint back after a compaction.

Installed as your agent's section says, it loads in every project beside your own personal rules. Your preferences go in those, not in `AGENTS.md`. Change `AGENTS.md` through this repo.

## What each repo provides

`/spec`, `/go`, `/cycle`, and `/slop-hunt` read the repo's `AGENTS.md`, or, when it has none, the agent instructions file in the repo root (such as `CLAUDE.md` or `GEMINI.md`). Put these there:

- the full gate command;
- the targeted test, format, lint, and typecheck commands;
- the contract regeneration and coverage commands, if any;
- the UI skill, if any;
- the paths never to commit;
- how to run the app on spare ports for a check.

Claude Code skips a repo's `AGENTS.md` when the repo also has a `CLAUDE.md`, so in a repo with both, add the line `@AGENTS.md` to `CLAUDE.md`.

The skills keep their working files in the main checkout's `.plans/`, and add `.plans/` to `.git/info/exclude` when the repo doesn't ignore it.

## Plumb

[Plumb](https://github.com/maxanstey-meridian/plumb) checks a repo against the Meridian doctrine. It's optional: the `meridian` skill and `/cycle`'s reviewers run it when a repo uses it.
