#!/bin/sh
# Tests hooks/after-compaction.sh. Plain sh like tests/install.sh rather than bats, so the repo needs no test dependency (it needs jq).
# Usage: sh tests/after-compaction.sh
#   HOOK=<after-compaction.sh>   the hook to test (default: the one beside this folder)
#   SHELLS="sh dash"             the shells to run it under (default: sh dash zsh bash; one that isn't installed is skipped)
# Each case runs in its own home under mktemp -d, through env -i, so the real $HOME and memory folders are never read.

HOOK=${HOOK:-$(dirname -- "$0")/../hooks/after-compaction.sh}
repo=$(CDPATH= cd -P -- "$(dirname -- "$HOOK")/.." && pwd) || exit 2
HOOK=$repo/hooks/$(basename -- "$HOOK")
[ -f "$HOOK" ] || { echo "no hook at $HOOK"; exit 2; }
jq_path=$(command -v jq) || { echo "these tests need jq"; exit 2; }
jq_dir=$(dirname -- "$jq_path")
tmp=$(mktemp -d) && tmp=$(cd -P "$tmp" && pwd) || exit 2
trap 'rm -rf "$tmp"' EXIT
trap 'exit 1' HUP INT TERM

# Running a case

scenario() { # <case>: starts the case in a new, empty home that holds a git repo
  name=$1 why="" sid="" transcript="" cwd=""
  H=$tmp/$shell/$1
  mkdir -p "$H/repo" && git init -q "$H/repo"
}
run_hook() { # [<PATH for the hook>]: sends the hook the case's session_id, cwd, and transcript_path; sets $out, $code, $context, $message
  json=$(jq -nc --arg s "$sid" --arg c "$cwd" --arg t "$transcript" '{session_id: $s, cwd: $c, transcript_path: $t} | with_entries(select(.value != ""))')
  out=$(printf '%s' "$json" | (cd "$H" && env -i HOME="$H" PATH="${1:-$jq_dir:/usr/bin:/bin}" "$shell_path" "$HOOK" 2>/dev/null))
  code=$?
  context=$(printf '%s' "$out" | jq -r '.hookSpecificOutput.additionalContext // empty' 2>/dev/null) || context=""
  message=$(printf '%s' "$out" | jq -r '.systemMessage // empty' 2>/dev/null) || message=""
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

# Setting up a home

waypoint() { # <path> <session_id> <updated> <marker> [<text of the Read first line>]
  mkdir -p "$(dirname -- "$1")"
  {
    printf -- '---\nname: x\nmetadata:\n  type: project\n  session_id: %s\n  updated: %s\n---\n\n' "$2" "$3"
    [ -z "${5:-}" ] || printf '**Read first:** %s\n' "$5"
    printf '**TLDR:** %s\n' "$4"
  } > "$1"
}

# Assertions

exits() { [ "$code" = "$1" ] || fail "exit $code, expected $1"; }
context_has() { printf '%s\n' "$context" | grep -qF -e "$1" || fail "the context lacks \"$1\""; }
context_lacks() { ! printf '%s\n' "$context" | grep -qF -e "$1" || fail "the context has \"$1\""; }
message_empty() { [ -z "$message" ] || fail "systemMessage is \"$message\", expected none"; }
message_has() { printf '%s\n' "$message" | grep -qF -e "$1" || fail "systemMessage lacks \"$1\""; }
reads_are() { # <file>…: the STOP list holds exactly these files, in this order
  want_=$(n_=0; for f_ in "$@"; do n_=$((n_ + 1)); printf '%s. %s\n' "$n_" "$f_"; done)
  printf '%s\n' "$context" | grep -qxF -e "$opening" ||
    fail "the STOP list lacks its opening sentence"
  got_=$(printf '%s\n' "$context" | sed -n '/^STOP/,/^Then continue/p' | grep '^[0-9]*\. ')
  [ "$got_" = "$want_" ] || fail "reads were: $(printf '%s' "$got_" | tr '\n' ' ')"
}

cases() {
  rules=$repo/AGENTS.md meridian=$repo/skills/meridian/SKILL.md
  opening="STOP. NON-NEGOTIABLE: before anything else this turn, including answering the user's message, read each of these files in full with your read tool, in order, even if it's already in your context."

  scenario frontmatter
  sid=0123456789abcdef transcript=$H/proj/t.jsonl
  waypoint "$H/proj/memory/waypoint-renamed.md" "$sid" "2026-01-01 10:00" MARK-FM
  waypoint "$H/proj/memory/waypoint-decoy.md" ffffffffffffffff "2026-02-01 10:00" MARK-DECOY
  run_hook; exits 0
  context_has MARK-FM; context_lacks MARK-DECOY; message_empty; reads_are "$rules" "$meridian"
  verdict

  scenario file-name
  sid=0123456789abcdef transcript=$H/proj/t.jsonl
  waypoint "$H/proj/memory/waypoint-89abcdef.md" none "2026-01-01 10:00" MARK-NAME
  waypoint "$H/proj/memory/waypoint-aaaaaaaa.md" ffffffffffffffff "2026-02-01 10:00" MARK-DECOY
  run_hook; exits 0
  context_has MARK-NAME; context_lacks MARK-DECOY; message_empty
  verdict

  scenario plans-folder
  sid=0123456789abcdef transcript=$H/proj/t.jsonl cwd=$H/repo
  waypoint "$H/repo/.plans/waypoints/waypoint-p.md" "$sid" "2026-01-01 10:00" MARK-PLANS
  run_hook; exits 0
  context_has MARK-PLANS; message_empty
  verdict

  scenario newest-wins
  sid=0123456789abcdef transcript=$H/proj/t.jsonl
  waypoint "$H/proj/memory/waypoint-aaa.md" "$sid" "2026-01-01 08:00" MARK-OLD
  waypoint "$H/proj/memory/waypoint-bbb.md" "$sid" "2026-03-05 09:30" MARK-NEW
  waypoint "$H/proj/memory/waypoint-ccc.md" "$sid" "2025-12-31 23:59" MARK-ANCIENT
  run_hook; exits 0
  context_has MARK-NEW; context_lacks MARK-OLD; context_lacks MARK-ANCIENT
  verdict

  scenario read-first
  sid=0123456789abcdef transcript=$H/proj/t.jsonl cwd=$H/repo
  mkdir -p "$H/repo/rel" "$H/.claude/skills"
  for f in real1 real2 real4 real5 real6; do echo x > "$H/$f.md"; done
  echo x > "$H/repo/rel/real3.md"; echo x > "$H/repo/rel/b.md"; echo x > "$H/repo/rel/a.md"
  ln -s "$repo/skills/meridian" "$H/.claude/skills/meridian"
  wp=$H/proj/memory/waypoint-r.md
  # also: prose after a path, and a comma inside a parenthetical
  waypoint "$wp" "$sid" "2026-01-01 10:00" MARK-READ "\`$H/real1.md\`, ~/real2.md, rel/real3.md, $H/real4.md (the index), $rules., $H/gone.md, this waypoint, $H/real1.md, \`$H/real5.md\`., ~/.claude/skills/meridian/SKILL.md, \`$H/real6.md\`. It has the full state, next steps, rel/b.md (Decisions 1, 2), rel/a.md, $wp"
  run_hook; exits 0
  context_has MARK-READ
  reads_are "$rules" "$meridian" "$H/real1.md" "$H/real2.md" "$H/repo/rel/real3.md" "$H/real4.md" "$H/real5.md" "$H/real6.md" "$H/repo/rel/b.md" "$H/repo/rel/a.md"
  verdict

  scenario no-waypoint
  sid=0123456789abcdef transcript=$H/proj/t.jsonl cwd=$H/repo
  waypoint "$H/proj/memory/waypoint-decoy.md" ffffffffffffffff "2026-02-01 10:00" MARK-DECOY
  run_hook; exits 0
  message_has "$sid"; message_has "$H/repo/.plans/waypoints"; message_has /waypoint
  reads_are "$rules" "$meridian"; context_has "tell the user"; context_lacks MARK-DECOY
  verdict

  scenario no-jq
  sid=0123456789abcdef transcript=$H/proj/t.jsonl cwd=$H/repo
  mkdir -p "$H/bin" && ln -s "$(command -v dirname)" "$H/bin/dirname"
  run_hook "$H/bin"; exits 0
  printf '%s\n' "$out" | grep -qF -e "jq isn't installed" || fail "no line naming jq: $out"
  printf '%s\n' "$out" | grep -qxF -e "$opening" || fail "no opening sentence in: $out"
  printf '%s\n' "$out" | grep -qxF -e "1. $rules" || fail "no numbered AGENTS.md in: $out"
  printf '%s\n' "$out" | grep -qxF -e "2. $meridian" || fail "no numbered meridian skill in: $out"
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
