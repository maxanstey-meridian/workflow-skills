#!/bin/sh
# Tests install.sh: for each case and each shell, the exit code, the links it leaves, and the leading word of the lines it prints.
# Usage: sh tests/install.sh
#   INSTALL=<install.sh>   the install to test (default: the one beside this folder)
#   SHELLS="sh dash"       the shells to run it under (default: sh dash zsh bash; one that isn't installed is skipped)
# Each case runs in its own home under mktemp -d, through env -i, so the real $HOME is never touched.

INSTALL=${INSTALL:-$(dirname -- "$0")/../install.sh}
repo=$(CDPATH= cd -- "$(dirname -- "$INSTALL")" && pwd) || exit 2
INSTALL=$repo/$(basename -- "$INSTALL")
[ -f "$INSTALL" ] || { echo "no install.sh at $INSTALL"; exit 2; }
tmp=$(mktemp -d) && tmp=$(cd "$tmp" && pwd) || exit 2
trap 'rm -rf "$tmp"' EXIT
trap 'exit 1' HUP INT TERM

# Running a case

scenario() { # <case>: starts the case in a new, empty home; links are expected into this repo
  name=$1 why="" r=$repo installer=$INSTALL
  H=$tmp/$shell/$1
  mkdir -p "$H"
}
run() { # [NAME=value] <install.sh arguments…>: runs the install from the home, as its user; sets $out and $code
  with=""
  case ${1:-} in *=*) with=$1; shift ;; esac
  out=$(cd "$H" && env -i HOME="$H" PATH=/usr/bin:/bin ${with:+"$with"} "$shell_path" "$installer" "$@" 2>&1 </dev/null)
  code=$?
}
fail() { case "$why;" in *"; $*;"*) ;; *) why="$why; $*" ;; esac; }   # each difference once per case
verdict() {
  if [ -z "$why" ]; then
    echo "ok $name ($shell)"
    passes=$((passes + 1))
  else
    echo "FAIL $name ($shell):${why#;}" | sed "s|$H|<home>|g; s|$repo|<repo>|g"
    fails=$((fails + 1))
  fi
}

# Setting up a home (paths are relative to it)

make_file() { mkdir -p "$(dirname "$H/$1")" && echo mine > "$H/$1"; }   # <path>: a file of yours
make_skill() { make_file "$1/SKILL.md"; }                                # <folder>: a skill of yours
make_link() { mkdir -p "$(dirname "$H/$2")" && ln -s "$1" "$H/$2"; }     # <target> <path>: a link of yours
clone() { # copies the clone into the home and runs the install from there; links are expected into the copy
  mkdir -p "$H/clone" && cp -R "$repo/install.sh" "$repo/AGENTS.md" "$repo/skills" "$H/clone/"
  r=$H/clone installer=$H/clone/install.sh
}
skill_names() { for s_ in "$repo"/skills/*/SKILL.md; do s_=${s_%/SKILL.md}; echo "${s_##*/}"; done; }

# Assertions (paths are relative to the home)

exits() { [ "$code" = "$1" ] || fail "exit $code, expected $1"; }
what() {
  if [ -L "$H/$1" ]; then echo "a link to $(readlink "$H/$1")"
  elif [ -d "$H/$1" ]; then echo "a folder"
  elif [ -e "$H/$1" ]; then echo "a file"
  else echo "missing"; fi
}
is_link() { # <path> <target>
  [ -L "$H/$1" ] && [ "$(readlink "$H/$1")" = "$2" ] || fail "$1 is $(what "$1"), expected a link to $2"
}
is_file() { # <path>: your file, unchanged
  [ -f "$H/$1" ] && [ ! -L "$H/$1" ] && [ "$(cat "$H/$1")" = mine ] || fail "$1 is $(what "$1"), expected your file"
}
is_missing() { [ ! -e "$H/$1" ] && [ ! -L "$H/$1" ] || fail "$1 is $(what "$1"), expected missing"; }
rules_at() { is_link "$1" "$r/AGENTS.md"; }
skills_in() { # <folder> [<skill left out>…]: a link to each other skill
  folder_=$1
  shift
  for n_ in $(skill_names); do
    case " $* " in *" $n_ "*) ;; *) is_link "$folder_/$n_" "$r/skills/$n_" ;; esac
  done
}
links_into_clone() { # [<folder to leave out>]: prints each link in the home that leads into the clone
  cd "$H" && find . -type l | while IFS= read -r p_; do
    case $(readlink "$p_") in "$r"/*) ;; *) continue ;; esac
    case $p_ in "./${1:-}"/*) [ -n "${1:-}" ] && continue ;; esac
    printf ' %s' "${p_#./}"
  done
}
no_links_into_clone() { # [<folder that keeps its links>]: no other link in the home leads into the clone
  left_=$(links_into_clone "$@")
  [ -z "$left_" ] || fail "links into the clone left:$left_"
}
lines() { printf '%s\n' "$out" | grep -F -e "${2:-}" | grep -c -e "^$1"; }   # <leading word> [<text>]
says() { [ "$(lines "$@")" -gt 0 ] || fail "no \"$1\" line${2:+ naming $2}"; }
says_no() { [ "$(lines "$@")" -eq 0 ] || fail "a \"$1\" line${2:+ naming $2}"; }
says_n() { [ "$(lines "$2")" -eq "$1" ] || fail "$(lines "$2") \"$2\" lines, expected $1"; }   # <count> <leading word>
says_line() { printf '%s\n' "$out" | grep -qxF -e "$1" || fail "no line \"$1\""; }   # <the whole line>

cases() {
  for agent in claude-code codex cursor copilot opencode gemini antigravity; do
    case $agent in
      claude-code) skills=.claude/skills rules=.claude/rules/workflow-skills.md ;;
      codex) skills=.agents/skills rules=.codex/AGENTS.md ;;
      cursor) skills=.agents/skills rules=.cursor/rules/workflow-skills.mdc ;;
      copilot) skills=.copilot/skills rules=.copilot/instructions/workflow-skills.instructions.md ;;
      opencode) skills=.agents/skills rules="" ;;
      gemini) skills=.agents/skills rules=.gemini/AGENTS.md ;;
      antigravity) skills=.gemini/antigravity-cli/skills rules=.gemini/antigravity-cli/rules/workflow-skills.md ;;
    esac
    scenario "fresh-$agent"
    for pass in first rerun; do
      run "$agent"; exits 0
      skills_in "$skills"
      [ -z "$rules" ] || rules_at "$rules"
      case $agent in
        opencode) is_missing .config/opencode/AGENTS.md; says - opencode.json ;;
        gemini) says - settings.json ;;
        antigravity) is_missing .gemini/AGENTS.md ;;
      esac
    done
    says already "$H/$skills/go"
    [ -z "$rules" ] || says already "${rules##*/}"
    verdict
  done

  scenario c1
  make_file .claude/CLAUDE.md; make_file .claude/rules/workflow-skills.md
  run claude-code; exits 1
  skills_in .claude/skills; is_file .claude/rules/workflow-skills.md; says skipped workflow-skills.md
  verdict

  scenario c2
  make_file dotfiles/claude-rules/mine.md; make_link "$H/dotfiles/claude-rules" .claude/rules
  run claude-code; exits 0
  rules_at dotfiles/claude-rules/workflow-skills.md; says note: claude-rules
  verdict

  scenario c3
  make_skill dotfiles/claude-skills/spec; make_link "$H/dotfiles/claude-skills" .claude/skills
  run claude-code; exits 1
  skills_in dotfiles/claude-skills spec; is_file dotfiles/claude-skills/spec/SKILL.md
  says skipped "$H/.claude/skills/spec"; says note: claude-skills
  verdict

  scenario c4
  make_skill dotfiles/skills/go
  make_link "$H/dotfiles/skills/go" .claude/skills/go
  make_link "$H/dotfiles/skills/where-not-cloned-yet" .claude/skills/where
  run claude-code; exits 1
  skills_in .claude/skills go where
  is_link .claude/skills/go "$H/dotfiles/skills/go"; says skipped "$H/.claude/skills/go"
  is_link .claude/skills/where "$H/dotfiles/skills/where-not-cloned-yet"; says skipped "$H/.claude/skills/where"
  verdict

  scenario c5
  make_link "$r/AGENTS.md" dotfiles/shared.md; make_link "$H/dotfiles/shared.md" .claude/rules/working-agreement.md
  run claude-code; exits 0
  says already working-agreement.md; is_missing .claude/rules/workflow-skills.md
  verdict

  scenario c6
  make_link "$r/AGENTS.md" .claude/rules/shared/x.md
  run claude-code; exits 0
  says already x.md; is_missing .claude/rules/workflow-skills.md
  verdict

  scenario x1
  make_file .codex/AGENTS.md
  run codex; exits 1
  is_file .codex/AGENTS.md; says skipped .codex/AGENTS.md
  verdict

  scenario x2
  make_file dotfiles/codex.md; make_link "$H/dotfiles/codex.md" .codex/AGENTS.md
  run codex; exits 1
  is_link .codex/AGENTS.md "$H/dotfiles/codex.md"; says skipped .codex/AGENTS.md
  verdict

  scenario x3
  make_link "$H/dotfiles/codex.md" .codex/AGENTS.md
  run codex; exits 1
  is_link .codex/AGENTS.md "$H/dotfiles/codex.md"; says skipped .codex/AGENTS.md
  verdict

  scenario x4
  mkdir -p "$H/.codex"; : > "$H/.codex/AGENTS.override.md"
  run codex; exits 0
  rules_at .codex/AGENTS.md
  verdict

  scenario x4b
  mkdir -p "$H/.codex"; printf '\n \n\n' > "$H/.codex/AGENTS.override.md"
  run codex; exits 0
  rules_at .codex/AGENTS.md
  verdict

  scenario x4c
  make_file .codex/AGENTS.override.md
  run codex; exits 1
  is_missing .codex/AGENTS.md; says skipped AGENTS.override.md
  verdict

  scenario x5
  make_link "$r/skills/go" .codex/skills/go; make_link "$r/skills/spec" .codex/skills/spec
  run codex; exits 0
  skills_in .agents/skills
  is_link .codex/skills/go "$r/skills/go"; is_link .codex/skills/spec "$r/skills/spec"
  verdict

  scenario x6
  run codex
  make_link "$r/skills/go" .codex/skills/go
  run codex; exits 0
  for n in $(skill_names); do says already "$H/.agents/skills/$n"; done
  verdict

  scenario x7
  mkdir -p "$H/.codex/skills"; make_link "$H/.codex/skills" .agents/skills
  run codex; exits 0
  skills_in .codex/skills; says_n 1 note:; says_no skipped; says_no removed
  verdict

  scenario x8
  make_skill .codex/skills/spec
  run codex; exits 1
  skills_in .agents/skills spec; is_missing .agents/skills/spec; says skipped "$H/.codex/skills"
  verdict

  scenario x9
  run codex
  make_skill .codex/skills/spec
  run codex; exits 1
  skills_in .agents/skills spec; is_missing .agents/skills/spec; says removed "$H/.codex/skills"
  verdict

  scenario x10
  make_skill .codex/skills/spec; make_link "$r/skills/spec-old" .agents/skills/spec
  run codex; exits 1
  skills_in .agents/skills spec; is_missing .agents/skills/spec; says removed "$H/.codex/skills"; says_no replaced
  verdict

  scenario x10b
  make_link "$r/skills/spec-old" .agents/skills/spec
  run codex; exits 0
  skills_in .agents/skills; says replaced "$H/.agents/skills/spec"
  verdict

  scenario o1
  clone; mkdir -p "$H/.config/opencode"
  echo '{ "instructions": ["~/clone/AGENTS.md"] }' > "$H/.config/opencode/opencode.json"
  run opencode; exits 0
  says already opencode
  verdict

  scenario o2
  make_skill .config/opencode/skills/spec
  run opencode; exits 1
  is_missing .agents/skills/spec; says skipped "$H/.config/opencode/skills"
  verdict

  scenario o3
  make_skill xdg/opencode/skills/spec
  run XDG_CONFIG_HOME="$H/xdg" opencode; exits 1
  is_missing .agents/skills/spec; says skipped "$H/xdg/opencode/skills"; says - "$H/xdg/opencode/opencode.json"
  verdict

  scenario o4
  run OPENCODE_CONFIG_DIR="$H/occ" opencode; exits 0
  says - "$H/occ/opencode.json"
  verdict

  scenario g1
  make_file .gemini/AGENTS.md; echo '{"context":{"fileName":"GEMINI.md"}}' > "$H/.gemini/settings.json"
  run gemini; exits 1
  is_file .gemini/AGENTS.md; says skipped .gemini/AGENTS.md; says - settings.json
  verdict

  scenario g2
  mkdir -p "$H/.gemini"; echo '{ "context": { "fileName": [ "AGENTS.md", "GEMINI.md" ] } }' > "$H/.gemini/settings.json"
  run gemini; exits 0
  says - settings.json
  verdict

  scenario g3
  make_link "$r/skills/go" .gemini/skills/go
  run gemini; exits 0
  is_link .agents/skills/go "$r/skills/go"; says note: .gemini/skills/go
  verdict

  scenario k1
  run cursor; exits 0
  rules_at .cursor/rules/workflow-skills.mdc; says - "User Rules"
  run cursor; exits 0
  rules_at .cursor/rules/workflow-skills.mdc; says_no "To finish"
  verdict

  scenario k2
  make_link "$r/AGENTS.md" .cursor/rules/old.md
  run cursor; exits 0
  rules_at .cursor/rules/workflow-skills.mdc
  verdict

  scenario p1
  run COPILOT_CUSTOM_INSTRUCTIONS_DIRS="/x,$r" copilot; exits 0
  rules_at .copilot/instructions/workflow-skills.instructions.md; says - COPILOT_CUSTOM_INSTRUCTIONS_DIRS
  verdict

  scenario p1b
  run COPILOT_CUSTOM_INSTRUCTIONS_DIRS="/x, $r" copilot; exits 0
  rules_at .copilot/instructions/workflow-skills.instructions.md; says - COPILOT_CUSTOM_INSTRUCTIONS_DIRS
  verdict

  scenario p2
  make_skill .agents/skills/spec
  run COPILOT_HOME="$H/cp" copilot; exits 0
  skills_in cp/skills; rules_at cp/instructions/workflow-skills.instructions.md; says_no skipped
  verdict

  scenario p3
  make_skill .agents/skills/spec
  run copilot; exits 1
  skills_in .copilot/skills spec; is_missing .copilot/skills/spec; says skipped "$H/.copilot/skills/spec"
  verdict

  scenario ag1
  make_file .gemini/AGENTS.md
  run antigravity; exits 0
  rules_at .gemini/antigravity-cli/rules/workflow-skills.md; is_file .gemini/AGENTS.md
  verdict

  scenario ag2
  run gemini
  run antigravity; exits 0
  says already .gemini/AGENTS.md; rules_at .gemini/AGENTS.md; is_missing .gemini/antigravity-cli/rules/workflow-skills.md
  verdict

  scenario ag3
  run antigravity
  run gemini; exits 0
  rules_at .gemini/AGENTS.md; is_missing .gemini/antigravity-cli/rules/workflow-skills.md
  verdict

  scenario ag4
  run antigravity
  ln -sfn "$r/AGENTS.md" "$H/.gemini/AGENTS.md"
  run antigravity; exits 0
  is_missing .gemini/antigravity-cli/rules/workflow-skills.md
  verdict

  scenario cc1
  make_skill .agents/skills/go
  run claude-code; exits 1
  skills_in .claude/skills go; is_missing .claude/skills/go; says skipped "$H/.agents/skills"
  verdict

  scenario a1
  run '~/.myagent/skills'; exits 2
  mkdir -p "$H/.myagent/rules"
  run "$H/.myagent/skills" "$H/.myagent/rules"; exits 1
  skills_in .myagent/skills; says skipped "$H/.myagent/rules"
  run .myagent/skills2 .myagent/rules/ws.md; exits 0
  skills_in .myagent/skills2; rules_at .myagent/rules/ws.md; says_no note:
  run .myagent/skills2 "$H/AGENTS.md"; exits 0
  rules_at AGENTS.md; says_no note:
  verdict

  scenario a2
  make_file x
  run "$H/.myagent/skills" "$H/x/rules.md"; exits 1
  skills_in .myagent/skills; is_missing x/rules.md
  verdict

  scenario z1
  cp "$repo/install.sh" "$H/install.sh"; installer=$H/install.sh
  run codex; exits 1
  says nothing; is_missing .agents/skills
  verdict

  scenario m1
  clone
  run claude-code
  mv "$H/clone" "$H/clone2"; installer=$H/clone2/install.sh
  run claude-code; exits 1
  skills_in .claude/skills; rules_at .claude/rules/workflow-skills.md
  for n in $(skill_names); do says skipped "$H/.claude/skills/$n"; done
  says_line "skipped $H/.claude/rules/workflow-skills.md: it's a broken link to $H/clone/AGENTS.md, and the install replaces only links into this clone; remove it, or restore what it points to, and rerun"
  verdict

  scenario u1
  make_file .claude/rules/mine.md
  for agent in claude-code codex cursor copilot opencode gemini antigravity; do run "$agent"; done
  make_skill dotfiles/skills/mine; make_link "$H/dotfiles/skills/mine" .agents/skills/mine
  run "$H/.myagent/skills" "$H/.myagent/rules.md"; exits 0
  skills_in .claude/skills; skills_in .agents/skills; skills_in .myagent/skills
  run uninstall; exits 0
  no_links_into_clone .myagent
  skills_in .myagent/skills; rules_at .myagent/rules.md
  is_file .claude/rules/mine.md; is_link .agents/skills/mine "$H/dotfiles/skills/mine"
  run uninstall "$H/.myagent/skills" "$H/.myagent/rules.md"; exits 0
  no_links_into_clone
  is_file .claude/rules/mine.md; is_link .agents/skills/mine "$H/dotfiles/skills/mine"
  verdict

  scenario u2
  mkdir -p "$H/dotfiles/claude-skills"; make_link "$H/dotfiles/claude-skills" .claude/skills
  run claude-code
  skills_in dotfiles/claude-skills
  run uninstall; exits 0
  no_links_into_clone; is_link .claude/skills "$H/dotfiles/claude-skills"
  verdict

  scenario u3
  run CODEX_HOME="$H/cx" codex
  run uninstall; exits 0
  rules_at cx/AGENTS.md; no_links_into_clone cx; says If CODEX_HOME
  verdict

  scenario u4
  clone
  run claude-code
  mv "$H/clone" "$H/clone2"; installer=$H/clone2/install.sh
  run uninstall; exits 0
  skills_in .claude/skills; rules_at .claude/rules/workflow-skills.md
  verdict

  scenario u5
  clone
  run codex
  rm -rf "$H/clone/skills/where"
  run codex; exits 0
  skills_in .agents/skills where; is_missing .agents/skills/where; says removed "$H/.agents/skills/where"
  verdict

  scenario u6
  run antigravity; rules_at .gemini/antigravity-cli/rules/workflow-skills.md
  run uninstall; exits 0
  no_links_into_clone
  verdict
}

passes=0 fails=0
rest="${SHELLS:-sh dash zsh bash} "
while [ -n "$rest" ]; do
  shell=${rest%% *}
  rest=${rest#* }
  [ -n "$shell" ] || continue
  if shell_path=$(command -v "$shell"); then
    cases
  else
    echo "skip ($shell): not installed"
  fi
done
echo "$passes ok, $fails FAIL"
[ "$fails" -eq 0 ]
