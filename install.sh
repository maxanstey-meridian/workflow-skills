#!/bin/sh
# Installs this repo's skills and shared rules (AGENTS.md) as links into this checkout, so `git pull` updates them.
# Usage: sh install.sh <agent>                        claude-code, codex, cursor, copilot, opencode, gemini, or antigravity
#        sh install.sh <skills folder> [<rules file>]  any other agent
#        sh install.sh uninstall [<path>…]              removes every link into this checkout
# Never replaces a real file, a folder, or a link it didn't make (broken or not), and never edits a config file.

repo=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1
if [ ! -f "$repo/skills/meridian/SKILL.md" ] || [ ! -f "$repo/AGENTS.md" ]; then
  echo "nothing installed: run install.sh from its place in the workflow-skills repo"
  exit 1
fi
usage() {
  echo "usage: sh install.sh <agent>   (claude-code, codex, cursor, copilot, opencode, gemini, or antigravity)"
  echo "       sh install.sh <skills folder> [<rules file>]   (a path, such as ~/.myagent/skills)"
  echo "       sh install.sh uninstall [<path>…]"
  exit 2
}
[ $# -ge 1 ] || usage

failed=0
todo=""
check=""
add_todo() { todo="$todo
- $1"; }

install_link() { # <source, relative to the repo> <destination> <skill | rules> [<what to do instead, for a file of yours>]
  if [ -L "$2" ] && [ "$(readlink "$2")" = "$repo/$1" ]; then
    echo "already linked $2"
  elif [ -e "$2" ] && [ ! -L "$2" ]; then
    if [ "$3" = skill ]; then
      echo "skipped $2: a skill of yours has this name; rename yours and rerun, because the routines read each other by name"
    else
      echo "skipped $2: it's a file of yours, and linking here would replace it; ${4:-name a different file}"
    fi
    failed=1
    return 1
  elif [ -L "$2" ] && [ -e "$2" ]; then
    if [ "$2" -ef "$repo/$1" ]; then
      echo "already installed: $2 reaches this repo through $(readlink "$2"); left as it is"
    else
      echo "skipped $2: it links to $(readlink "$2"); ${4:-remove that link and rerun}"
      failed=1
      return 1
    fi
  elif [ -L "$2" ]; then
    case $(readlink "$2") in
      "$repo"/*)
        echo "replaced broken link $2 (it pointed to $(readlink "$2"))"
        ln -sfn "$repo/$1" "$2" || { failed=1; return 1; }
        ;;
      *)
        echo "skipped $2: it's a broken link to $(readlink "$2"), and the install replaces only links into this clone; ${4:-remove it, or restore what it points to, and rerun}"
        failed=1
        return 1
        ;;
    esac
  else
    ln -s "$repo/$1" "$2" && echo "linked $2" || { failed=1; return 1; }
  fi
}

noted="
"
note_if_linked() { # <folder>; says so, once per folder, when it or a folder above it is a link (a home behind a link doesn't count)
  real=$(CDPATH= cd -P -- "$1" 2>/dev/null && pwd) || return 0
  given=$(CDPATH= cd -- "$1" 2>/dev/null && pwd) || return 0
  case $given in
    "$HOME"/*) given=$home_real/${given#"$HOME"/} ;;
  esac
  [ "$real" != "$given" ] || return 0
  case $noted in
    *"
$1
"*) return 0 ;;
  esac
  noted="$noted$1
"
  echo "note: $1 is a link to $real, so these links live there"
}

link_skills() { # <skills folder> [<another folder an agent reads beside it>…]
  dest=${1%/}
  shift
  mkdir -p "$dest" || { failed=1; return; }
  note_if_linked "$dest"
  dest_real=$(CDPATH= cd -P -- "$dest" && pwd)
  n=$#
  while [ "$n" -gt 0 ]; do
    other=${1%/}
    shift
    n=$((n - 1))
    [ "$(CDPATH= cd -P -- "$other" 2>/dev/null && pwd)" = "$dest_real" ] || set -- "$@" "$other"
  done
  for skill in "$repo"/skills/*/SKILL.md; do
    name=$(basename "$(dirname "$skill")")
    ours=""
    if [ -L "$dest/$name" ] && [ "$(readlink "$dest/$name")" = "$repo/skills/$name" ]; then
      ours=1
    fi
    if { [ -e "$dest/$name" ] || [ -L "$dest/$name" ]; } && [ -z "$ours" ] && [ ! "$dest/$name" -ef "$repo/skills/$name" ]; then
      install_link "skills/$name" "$dest/$name" skill
      continue
    fi
    clash=""
    for other in "$@"; do
      if [ -e "$other/$name/SKILL.md" ] && [ ! "$other/$name" -ef "$repo/skills/$name" ]; then
        clash=$other
        break
      fi
    done
    if [ -n "$clash" ]; then
      why="a skill of yours called $name is in $clash, and an agent that reads both folders would load one in place of the other; rename yours and rerun"
      if [ -n "$ours" ]; then
        rm -- "${dest:?}/${name:?}" && echo "removed $dest/$name: $why"
      else
        echo "skipped $dest/$name: $why"
      fi
      failed=1
    elif install_link "skills/$name" "$dest/$name" skill && [ "$dest" = "$HOME/.agents/skills" ] &&
      [ "$HOME/.gemini/skills/$name" -ef "$repo/skills/$name" ] && [ ! "$HOME/.gemini/skills" -ef "$dest" ]; then
      echo "note: $HOME/.gemini/skills/$name also links here, so Gemini warns of a skill conflict each time it starts; remove that link to stop it"
    fi
  done
  find "$dest/" -mindepth 1 -maxdepth 1 -type l | while IFS= read -r entry; do
    if [ ! -e "$entry" ]; then
      case $(readlink "$entry") in
        "$repo"/skills/*) rm -- "$entry" && echo "removed $entry: its skill is no longer in this repo" ;;
      esac
    fi
  done
}

link_agents_skills() { # ~/.agents/skills, beside the folders Codex, Cursor, Copilot, OpenCode, and Gemini read with it
  set -- "$codex_home/skills" "$HOME/.cursor/skills" "$HOME/.claude/skills" "$HOME/.codex/skills" "$HOME/.grok/skills"
  [ -n "${COPILOT_HOME:-}" ] || set -- "$@" "$HOME/.copilot/skills"
  link_skills "$HOME/.agents/skills" "$@" "$opencode_home/skills" "$opencode_home/skill" "$HOME/.gemini/skills"
}

link_rules_in_folder() { # <rules folder> <file name> <name pattern the agent loads> <depth it loads: 1 | any> <what to do instead, for a file of yours>
  if [ -d "$1" ]; then
    found=$(if [ "$4" = 1 ]; then find "$1/" -mindepth 1 -maxdepth 1 -name "$3"; else find "$1/" -mindepth 1 -name "$3"; fi | while IFS= read -r file; do
      if [ "$file" -ef "$repo/AGENTS.md" ]; then
        echo "$file"
        break
      fi
    done)
    if [ -n "$found" ]; then
      echo "already installed: $found is this repo's AGENTS.md"
      return
    fi
  fi
  mkdir -p "$1" || { failed=1; return 1; }
  note_if_linked "$1"
  if [ -e "$1/$2" ] || [ ! -L "$1/$2" ]; then
    install_link AGENTS.md "$1/$2" rules "$5"
  else
    install_link AGENTS.md "$1/$2" rules ""
  fi
}

link_only_rules_file() { # <rules file the agent loads> <where your own rules go instead>
  if [ -e "$1" ] && [ ! "$1" -ef "$repo/AGENTS.md" ]; then
    echo "skipped $1: it holds rules of yours, and this file has to be the shared one; move its lines into $2, remove it, and rerun"
    failed=1
    return 1
  fi
  mkdir -p "$(dirname "$1")" || { failed=1; return 1; }
  note_if_linked "$(dirname "$1")"
  install_link AGENTS.md "$1" rules "if it's yours, move its lines into $2, remove it, and rerun"
}

unlink_into_repo() { # <path>; fails when it isn't a link into this repo
  [ -L "$1" ] || return 1
  case $(readlink "$1") in
    "$repo"/skills/* | "$repo"/AGENTS.md) rm -- "$1" && echo "removed $1" ;;
    *) return 1 ;;
  esac
}

codex_home=${CODEX_HOME:-$HOME/.codex}
copilot_home=${COPILOT_HOME:-$HOME/.copilot}
opencode_home=${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}
home_real=$(CDPATH= cd -P -- "$HOME" 2>/dev/null && pwd) || home_real=$HOME
repo_from_home=$(printf '%s' "$repo" | sed "s|^$HOME/|~/|")

case $1 in
  uninstall)
    shift
    for target in "$HOME/.claude/skills" "$HOME/.agents/skills" "$codex_home/skills" "$HOME/.cursor/skills" \
      "$copilot_home/skills" "$opencode_home/skills" "$HOME/.gemini/skills" "$HOME/.gemini/antigravity-cli/skills" \
      "$HOME/.claude/rules" "$codex_home/AGENTS.md" "$HOME/.gemini/AGENTS.md" "$HOME/.cursor/rules" "$copilot_home/instructions" \
      "$HOME/.gemini/antigravity-cli/rules" "$@"; do
      if ! unlink_into_repo "$target" && [ -d "$target" ]; then
        find "$target/" -mindepth 1 -maxdepth 1 -type l | while IFS= read -r entry; do unlink_into_repo "$entry"; done
      fi
    done
    echo "If you installed with CODEX_HOME or COPILOT_HOME set, rerun this with the same values."
    echo "Remove by hand what you added only for this: OpenCode's \"instructions\" entry and Gemini's \"AGENTS.md\" in context.fileName; from an earlier install, Cursor's pasted User Rules and COPILOT_CUSTOM_INSTRUCTIONS_DIRS in your shell profile."
    exit 0
    ;;
  claude-code)
    [ $# -eq 1 ] || usage
    link_skills "$HOME/.claude/skills" "$HOME/.cursor/skills" "$HOME/.agents/skills" "$HOME/.codex/skills" "$HOME/.grok/skills" \
      "$opencode_home/skills" "$opencode_home/skill"
    link_rules_in_folder "$HOME/.claude/rules" workflow-skills.md '*.md' any \
      "rename yours (every .md file in $HOME/.claude/rules loads, whatever its name) and rerun"
    check="start a new session: /skills lists the seven skills, and /context lists the rules file in $HOME/.claude/rules under Memory files, beside your own CLAUDE.md"
    ;;
  codex)
    [ $# -eq 1 ] || usage
    link_agents_skills
    if grep -q '[^[:space:]]' "$codex_home/AGENTS.override.md" 2>/dev/null && [ ! "$codex_home/AGENTS.override.md" -ef "$repo/AGENTS.md" ]; then
      echo "skipped the rules: Codex reads $codex_home/AGENTS.override.md in place of AGENTS.md while it exists; move its lines into developer_instructions in $codex_home/config.toml (see the README), remove it, and rerun"
      failed=1
    elif link_only_rules_file "$codex_home/AGENTS.md" "developer_instructions in $codex_home/config.toml (see the README)"; then
      echo "Your own Codex rules go in developer_instructions = '''…''' at the top of $codex_home/config.toml, before any [section] line: $codex_home/AGENTS.md is this repo's file now, so an edit there changes the repo."
    fi
    check="start a new session: /skills lists the seven skills, /status lists $codex_home/AGENTS.md on its Agents.md row, and asking \"List the instruction sources you loaded\" names your developer_instructions"
    ;;
  cursor)
    [ $# -eq 1 ] || usage
    link_agents_skills
    mdc=$HOME/.cursor/rules/workflow-skills.mdc
    was_link=""
    [ ! -L "$mdc" ] || was_link=1
    link_rules_in_folder "$HOME/.cursor/rules" workflow-skills.mdc '*.mdc' any "rename yours and rerun"
    if [ -z "$was_link" ] && [ -L "$mdc" ]; then
      add_todo "if you pasted AGENTS.md into Cursor's Customize → Rules → User Rules for an earlier install, remove it: the rules now load from $mdc"
    fi
    check="in a new Agent chat or cursor-agent session, / lists the seven skills; in the IDE, Customize → Rules lists workflow-skills"
    ;;
  copilot)
    [ $# -eq 1 ] || usage
    if [ -n "${COPILOT_HOME:-}" ]; then
      link_skills "$copilot_home/skills"
    else
      link_skills "$copilot_home/skills" "$HOME/.agents/skills"
    fi
    link_rules_in_folder "$copilot_home/instructions" workflow-skills.instructions.md '*.instructions.md' any "rename yours and rerun"
    case ",${COPILOT_CUSTOM_INSTRUCTIONS_DIRS:-}," in
      *",$repo,"* | *",$repo/,"*) add_todo "remove $repo from COPILOT_CUSTOM_INSTRUCTIONS_DIRS in your shell profile and open a new terminal: the rules now load from $copilot_home/instructions/workflow-skills.instructions.md, and with both they load twice" ;;
    esac
    check="start a new or resumed copilot session: /skills list shows the seven skills, and /instructions lists workflow-skills.instructions.md beside your $copilot_home/copilot-instructions.md"
    ;;
  opencode)
    [ $# -eq 1 ] || usage
    link_agents_skills
    if grep -qF -e "\"$repo/AGENTS.md\"" -e "\"$repo_from_home/AGENTS.md\"" "$opencode_home/opencode.json" "$opencode_home/opencode.jsonc" 2>/dev/null; then
      echo "already installed: $opencode_home's config lists $repo/AGENTS.md in its instructions"
    elif [ -e "$opencode_home/opencode.json" ] || [ -e "$opencode_home/opencode.jsonc" ]; then
      add_todo "add \"$repo/AGENTS.md\" to the \"instructions\" list in your $opencode_home config, creating the list if it has none: \"instructions\": [\"$repo/AGENTS.md\"]"
    else
      add_todo "create $opencode_home/opencode.json holding: { \"instructions\": [\"$repo/AGENTS.md\"] }"
    fi
    check="start a new session and ask \"Which skills can you load, and which instruction files did you load?\": it names the seven skills, $repo/AGENTS.md, and your own $opencode_home/AGENTS.md"
    ;;
  gemini)
    [ $# -eq 1 ] || usage
    link_agents_skills
    if link_only_rules_file "$HOME/.gemini/AGENTS.md" "$HOME/.gemini/GEMINI.md" &&
      unlink_into_repo "$HOME/.gemini/antigravity-cli/rules/workflow-skills.md"; then
      echo "Antigravity now loads the rules from $HOME/.gemini/AGENTS.md"
    fi
    if [ -f "$HOME/.gemini/settings.json" ] && tr -d ' \t\r\n' < "$HOME/.gemini/settings.json" | grep -qF '"fileName":["GEMINI.md","AGENTS.md"'; then
      echo "already installed: $HOME/.gemini/settings.json loads GEMINI.md, then AGENTS.md"
    elif [ -e "$HOME/.gemini/settings.json" ]; then
      add_todo "in $HOME/.gemini/settings.json, set context.fileName to [\"GEMINI.md\", \"AGENTS.md\"], in that order and inside its existing \"context\" block if it has one: \"context\": { \"fileName\": [\"GEMINI.md\", \"AGENTS.md\"] }"
    else
      add_todo "create $HOME/.gemini/settings.json holding: { \"context\": { \"fileName\": [\"GEMINI.md\", \"AGENTS.md\"] } }"
    fi
    check="start a new session: /skills list shows the seven skills, and /memory list names $HOME/.gemini/GEMINI.md and $HOME/.gemini/AGENTS.md"
    ;;
  antigravity)
    [ $# -eq 1 ] || usage
    link_skills "$HOME/.gemini/antigravity-cli/skills"
    if [ "$HOME/.gemini/AGENTS.md" -ef "$repo/AGENTS.md" ]; then
      echo "already installed: Antigravity loads $HOME/.gemini/AGENTS.md, which leads to this repo's AGENTS.md"
      unlink_into_repo "$HOME/.gemini/antigravity-cli/rules/workflow-skills.md"
      ag_rules=$HOME/.gemini/AGENTS.md
    else
      link_rules_in_folder "$HOME/.gemini/antigravity-cli/rules" workflow-skills.md '*.md' 1 "rename yours and rerun"
      ag_rules=$HOME/.gemini/antigravity-cli/rules/workflow-skills.md
    fi
    check="start a new session: /skills lists the seven skills, and /context lists $ag_rules under System files"
    ;;
  "~"*)
    echo "skipped $1: the shell didn't expand the ~, so write it unquoted or use \$HOME"
    exit 2
    ;;
  */*)
    [ $# -le 2 ] || usage
    case ${2:-} in
      "~"*) echo "skipped $2: the shell didn't expand the ~, so write it unquoted or use \$HOME"; exit 2 ;;
    esac
    link_skills "$1"
    if [ $# -eq 2 ]; then
      rules=${2%/}
      if [ -d "$rules" ] && [ ! -L "$rules" ]; then
        echo "skipped $rules: it's a folder; name the file to create in it, such as $rules/workflow-skills.md"
        failed=1
      else
        if mkdir -p "$(dirname "$rules")"; then
          note_if_linked "$(dirname "$rules")"
          install_link AGENTS.md "$rules" rules
        else
          failed=1
        fi
      fi
    fi
    ;;
  *)
    echo "unknown agent: $1"
    usage
    ;;
esac

if [ -n "$todo" ]; then
  echo
  echo "To finish:$todo"
fi
if [ -n "$check" ]; then
  echo
  echo "Check: $check."
fi
if [ $failed -ne 0 ]; then
  echo
  echo "Not everything was installed: see the skipped lines above."
  exit 1
fi
