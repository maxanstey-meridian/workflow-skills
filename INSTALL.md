# Install

The [README](README.md#install) has the prerequisites and the two commands: clone the repo, then run `install.sh` with your agent's name. This file has the rest.

The install never replaces a file, a folder, or a link of yours, and never edits a config file. It replaces a broken link only when it pointed into this clone. It says what it skipped and why, and exits non-zero when it skipped something you asked for. A link of yours that already leads to this repo, through another link, say, counts as installed. Rerunning it is safe. A copy run from outside the clone changes nothing.

If a folder the install links into, or one an agent reads beside it, already holds a skill called `spec`, `go`, `cycle`, `waypoint`, `slop-hunt`, `readme`, or `meridian`, the install skips that one and names the folder; rename yours and rerun.

## Claude Code

```bash
sh ~/src/workflow-skills/install.sh claude-code
```

- **Skills:** linked into `~/.claude/skills`. Claude Code doesn't read `~/.agents/skills`.
- **Rules:** linked as `~/.claude/rules/workflow-skills.md`. Every `.md` file in `~/.claude/rules/` loads beside your `~/.claude/CLAUDE.md`, so your own rules stay where they are. If you already have a `workflow-skills.md` there, rename yours and rerun.
- **After a compaction:** add the hook the install prints under "To finish" to `~/.claude/settings.json`. It's a `SessionStart` hook on `compact` that runs `hooks/after-compaction.sh`, which puts the session's waypoint back and has the agent read `AGENTS.md`, the house Laws, and the files the waypoint names. See [After a compaction](README.md#after-a-compaction).
- **Call a skill:** `/name`.
- **Check:** in a new session, `/skills` lists the workflow skills, and `/context` lists the rules file under Memory files, beside your `CLAUDE.md`.
- Cowork desktop sessions load neither: they skip personal skills, and linked rules that point outside the working folder. Cloud sessions have no `~/.claude` at all. The skills reach both only when they're enabled on your claude.ai account. The skills take their shared definitions from `AGENTS.md`, so those sessions also need its text added to their instructions.

## Codex

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
- **After a compaction:** add the lines the install prints under "To finish" to the end of `~/.codex/config.toml`: a `SessionStart` hook on `compact` that runs `hooks/after-compaction.sh`, with `additionalContextLimit = 0` so Codex passes the whole waypoint rather than a preview. Codex asks you to review a new hook at startup before it runs ("hooks need review before they can run"), so approve it once. See [After a compaction](README.md#after-a-compaction).
- **Call a skill:** `$name`, or pick it from `/skills`.
- **Check:** start a new session: `/skills` lists the workflow skills, `/status` lists `~/.codex/AGENTS.md` on its `Agents.md` row, and asking "List the instruction sources you loaded" names your `developer_instructions`.
- Codex's default sandbox keeps `.git` read-only, so it asks before `/cycle` commits and before a routine adds `.plans/` to `.git/info/exclude`. Approve those, or allow `.git` writes in your sandbox settings.

## Cursor

```bash
sh ~/src/workflow-skills/install.sh cursor
```

- **Skills:** linked into `~/.agents/skills`, not `~/.cursor/skills`, which Cursor's "Sync Skills for Cloud Agents" moves into synced storage, where `git pull` no longer reaches. Cursor also reads `~/.claude/skills` and `~/.codex/skills`, so if you install for Claude Code too, Cursor finds each skill twice; the Cursor CLI lists each once. Linked skill folders need Cursor CLI 2026.06.22 or later.
- **Rules:** linked as `~/.cursor/rules/workflow-skills.mdc`. `AGENTS.md` starts with `alwaysApply: true` frontmatter, so Cursor loads it on every request, beside your own User Rules and rule files. `cursor-agent` reads it only in projects under your home folder. If you already have a `workflow-skills.mdc` there, rename yours and rerun. If you pasted `AGENTS.md` into Customize → Rules → User Rules for an earlier install, remove it: the install reminds you once.
- **Call a skill:** type `/` in Agent chat and pick it.
- **Check:** in a new Agent chat or `cursor-agent` session, `/` lists the workflow skills; in the IDE, Customize → Rules lists `workflow-skills`.

## Copilot CLI

```bash
sh ~/src/workflow-skills/install.sh copilot
```

- **Skills:** linked into `~/.copilot/skills`, or `$COPILOT_HOME/skills` when you've set `COPILOT_HOME`. Copilot also reads `~/.agents/skills` unless `COPILOT_HOME` is set; the install checks both for a skill of yours with the same name.
- **Rules:** linked as `~/.copilot/instructions/workflow-skills.instructions.md` (or in `$COPILOT_HOME/instructions`), which loads in every repo beside your own `~/.copilot/copilot-instructions.md` (or `$COPILOT_HOME/copilot-instructions.md`). If you already have a `workflow-skills.instructions.md` there, rename yours and rerun. Changes to instruction files apply in a new or resumed session. If your shell profile sets `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` to the clone from an earlier install, the install says so: remove the clone from it, or the rules load twice.
- **Call a skill:** `/name`.
- **Check:** start a new or resumed `copilot` session: `/skills list` shows the workflow skills, and `/instructions` lists `workflow-skills.instructions.md` beside your `~/.copilot/copilot-instructions.md`.

## OpenCode

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
- **Check:** in a new session, ask "Which skills can you load, and which instruction files did you load?": it names the workflow skills, the clone's `AGENTS.md`, and your own.

## Gemini CLI

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
- **Check:** `/skills list` shows the workflow skills, and `/memory list` names `~/.gemini/GEMINI.md` and `~/.gemini/AGENTS.md`.

## Antigravity CLI

```bash
sh ~/src/workflow-skills/install.sh antigravity
```

- **Skills:** linked into `~/.gemini/antigravity-cli/skills`.
- **Rules:** linked as `~/.gemini/antigravity-cli/rules/workflow-skills.md`, which loads beside your own rules; if `~/.gemini/AGENTS.md` already leads to the clone (from a Gemini install), the install uses that instead. If you already have a `workflow-skills.md` there, rename yours and rerun.
- **Call a skill:** `/name`.
- **Check:** start a new session: `/skills` lists the workflow skills, and `/context` lists `~/.gemini/antigravity-cli/rules/workflow-skills.md` under System files, or `~/.gemini/AGENTS.md` when the install used that.
- Checked against Antigravity's docs only, not in a live session.

## Other agent

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

## Each repo

`/cycle`, `/slop-hunt`, `/readme`, and the subagents of `/spec` and `/go` read the repo's `AGENTS.md`, or, when it has none, the agent instructions file in the repo root (such as `CLAUDE.md` or `GEMINI.md`). Put these there:

- the full gate command;
- the targeted test commands, and where the tests live;
- format and lint in check mode, for the critic;
- a mutation command (optional), such as Stryker.NET or StrykerJS. It takes named source files, with each name or pattern matching only that file, runs without git, exits non-zero when any mutant in those files survives or has no test, and writes a mutation report in `mutation-testing-elements` JSON format at a path you name. Keep its output folder git-ignored. `/cycle`'s auditor runs it once, over the files the cycle changed; without one, the report says so under Mutation. `/go` never runs it;
- the contract regeneration command, if any;
- the UI skill, if any;
- the paths never to commit;
- the docs voice, if the README shouldn't use `/readme`'s house voice.

A command you'd rather not write there can be a task in the repo root's `Taskfile.yml` ([Task](https://taskfile.dev/)): where the instructions name no command, the routines run `task gate` for the gate, `task build` for the build, and `task test`, `task lint`, and `task format` for those checks, when the Taskfile has them.

Claude Code skips a repo's `AGENTS.md` when the repo also has a `CLAUDE.md` or a `CLAUDE.local.md`, so in such a repo, add the line `@AGENTS.md` to `CLAUDE.md`. Reading `AGENTS.md` needs Claude Code 2.1.277 or later.

The skills keep their working files in the main checkout's `.plans/`, and add `.plans/` to `.git/info/exclude` when the repo doesn't ignore it.

## Update and uninstall

- **Update:** run `git pull && sh install.sh <agent>` in the clone. The links follow the pull, and the rerun links new skills and removes links to skills that are gone. Before you move the clone, run `sh install.sh uninstall`, then install from the new place: after a move, the old links point at nothing, and the install can't tell them from broken links of yours, so neither a rerun nor an uninstall from the new place removes them.
- **Uninstall:** `sh install.sh uninstall` removes every link into the clone from the folders above; add any folder or file you passed to the "Other agent" form, and set `CODEX_HOME` or `COPILOT_HOME` as you did for the install. It leaves the clone and your config files alone, and lists what you may have added by hand: OpenCode's `instructions` entry and Gemini's `AGENTS.md` in `context.fileName`, and, from an earlier install, Cursor's pasted User Rules and `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` in your shell profile.
