#!/bin/sh
# Installs this repo's skills and shared rules (AGENTS.md) as links into this checkout, so `git pull` updates them.
# Usage: sh install.sh <agent>                        claude-code, codex, cursor, copilot, opencode, gemini, or antigravity
#        sh install.sh <skills folder> [<rules file>]  any other agent
#        sh install.sh uninstall [<path>…]              removes every link into this checkout
# Never replaces a real file, a folder, or a link that points somewhere else, and never edits a config file.

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
    echo "replaced broken link $2 (it pointed to $(readlink "$2"))"
    ln -sfn "$repo/$1" "$2" || { failed=1; return 1; }
  else
    ln -s "$repo/$1" "$2" && echo "linked $2" || { failed=1; return 1; }
  fi
}

link_skills() { # <skills folder> [<another skills folder the agent reads, where a second link would list twice>…]
  dest=${1%/}
  shift
  mkdir -p "$dest" || { failed=1; return; }
  for skill in "$repo"/skills/*/SKILL.md; do
    name=$(basename "$(dirname "$skill")")
    reached=""
    if [ ! -e "$dest/$name" ] && [ ! -L "$dest/$name" ]; then
      for other in "$@"; do
        if [ "$other/$name" -ef "$repo/skills/$name" ]; then
          reached="$other/$name"
          break
        fi
      done
    fi
    if [ -n "$reached" ]; then
      echo "already installed: $reached reaches this repo, and a second link would list $name twice"
    else
      install_link "skills/$name" "$dest/$name" skill
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

link_rules_in_folder() { # <rules folder> <file name> <what to do instead, for a file of yours>
  if [ -d "$1" ]; then
    found=$(find "$1/" -mindepth 1 -maxdepth 1 -name '*.md' | while IFS= read -r file; do
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
  mkdir -p "$1" && install_link AGENTS.md "$1/$2" rules "$3"
}

link_only_rules_file() { # <rules file the agent loads> <where your own rules go instead>
  if [ -e "$1" ] && [ ! "$1" -ef "$repo/AGENTS.md" ]; then
    echo "skipped $1: it holds rules of yours, and this file has to be the shared one; move its lines into $2, remove it, and rerun"
    failed=1
    return 1
  fi
  mkdir -p "$(dirname "$1")" && install_link AGENTS.md "$1" rules
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
opencode_home=$HOME/.config/opencode
repo_from_home=$(printf '%s' "$repo" | sed "s|^$HOME/|~/|")

case $1 in
  uninstall)
    shift
    for target in "$HOME/.claude/skills" "$HOME/.agents/skills" "$codex_home/skills" "$HOME/.cursor/skills" \
      "$copilot_home/skills" "$opencode_home/skills" "$HOME/.gemini/skills" "$HOME/.gemini/antigravity-cli/skills" \
      "$HOME/.claude/rules" "$codex_home/AGENTS.md" "$HOME/.gemini/AGENTS.md" "$@"; do
      if ! unlink_into_repo "$target" && [ -d "$target" ]; then
        find "$target/" -mindepth 1 -maxdepth 1 -type l | while IFS= read -r entry; do unlink_into_repo "$entry"; done
      fi
    done
    echo "If you installed with CODEX_HOME or COPILOT_HOME set, rerun this with the same values."
    echo "Remove by hand what you added only for this: Cursor's pasted User Rules, OpenCode's \"instructions\" entry, Gemini's \"AGENTS.md\" in context.fileName, or COPILOT_CUSTOM_INSTRUCTIONS_DIRS in your shell profile."
    exit 0
    ;;
  claude-code)
    [ $# -eq 1 ] || usage
    link_skills "$HOME/.claude/skills"
    link_rules_in_folder "$HOME/.claude/rules" workflow-skills.md \
      "rename yours (every .md file in $HOME/.claude/rules loads, whatever its name) and rerun"
    check="start a new session: /skills lists the seven skills, and /context lists the rules file in $HOME/.claude/rules under Memory files, beside your own CLAUDE.md"
    ;;
  codex)
    [ $# -eq 1 ] || usage
    link_skills "$HOME/.agents/skills" "$codex_home/skills"
    if [ -s "$codex_home/AGENTS.override.md" ] && [ ! "$codex_home/AGENTS.override.md" -ef "$repo/AGENTS.md" ]; then
      echo "skipped the rules: Codex reads $codex_home/AGENTS.override.md in place of AGENTS.md while it exists; move its lines into developer_instructions in $codex_home/config.toml (see the README), remove it, and rerun"
      failed=1
    elif link_only_rules_file "$codex_home/AGENTS.md" "developer_instructions in $codex_home/config.toml (see the README)"; then
      echo "Your own Codex rules go in developer_instructions = '''…''' at the top of $codex_home/config.toml, before any [section] line: $codex_home/AGENTS.md is this repo's file now, so an edit there changes the repo."
    fi
    check="start a new session: /skills lists the seven skills, and asking \"List the instruction sources you loaded\" names $codex_home/AGENTS.md and your developer_instructions"
    ;;
  cursor)
    [ $# -eq 1 ] || usage
    link_skills "$HOME/.agents/skills"
    add_todo "Cursor keeps global rules only in its settings: paste $repo/AGENTS.md into Customize → Rules → User Rules, beside your own"
    add_todo "after each git pull, run git -C $repo diff ORIG_HEAD -- AGENTS.md; if it prints anything, paste the file again"
    check="type / in Agent chat: the seven skills are listed, and Customize → Rules shows your User Rules"
    ;;
  copilot)
    [ $# -eq 1 ] || usage
    link_skills "$copilot_home/skills"
    case ",${COPILOT_CUSTOM_INSTRUCTIONS_DIRS:-}," in
      *",$repo,"* | *",$repo/,"*) echo "already installed: COPILOT_CUSTOM_INSTRUCTIONS_DIRS loads $repo/AGENTS.md" ;;
      *) add_todo "add this line to your shell profile (~/.zshrc or ~/.bashrc) and open a new terminal: export COPILOT_CUSTOM_INSTRUCTIONS_DIRS=\"$repo\" (if it's already set, add $repo after a comma)" ;;
    esac
    check="start copilot from a new terminal: /skills list shows the seven skills, and /instructions lists $repo/AGENTS.md beside your $copilot_home/copilot-instructions.md"
    ;;
  opencode)
    [ $# -eq 1 ] || usage
    link_skills "$HOME/.agents/skills"
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
    link_skills "$HOME/.agents/skills"
    link_only_rules_file "$HOME/.gemini/AGENTS.md" "$HOME/.gemini/GEMINI.md"
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
    link_only_rules_file "$HOME/.gemini/AGENTS.md" "$HOME/.gemini/GEMINI.md"
    check="start a new session and ask which skills and rules files it loaded: it names the seven skills, $HOME/.gemini/AGENTS.md, and your own $HOME/.gemini/GEMINI.md"
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
        mkdir -p "$(dirname "$rules")" && install_link AGENTS.md "$rules" rules
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
