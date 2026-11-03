#!/bin/sh
# Runs after a compaction: puts this session's waypoint back into context and orders the reads: this clone's AGENTS.md and
# meridian skill always, then the files the waypoint's "Read first" line names.
# AGENTS.md 'Routines' says to read them; this makes it happen without the agent remembering to.
# Input: the hook's JSON on stdin, with session_id and cwd, and transcript_path where the agent gives one.
# Output: JSON with the text for the agent's context, and a message for the user when no waypoint is found.
# Why it shouts: as of November 2026, of 78 compactions measured, 40 had summaries that carried the rule to read AGENTS.md,
# the meridian skill, and the waypoint, and after none of those 40 did the agent load the meridian skill itself; the waypoint
# was read after 2 of the 78. Plainer wording was ignored. The "STOP. NON-NEGOTIABLE" list was the first wording one obeyed.
# Don't soften it.
set -eu

repo=$(CDPATH= cd -P -- "$(dirname -- "$0")/.." && pwd)

rules=$repo/AGENTS.md
meridian=$repo/skills/meridian/SKILL.md
opening="STOP. NON-NEGOTIABLE: before anything else this turn, including answering the user's message, read each of these files in full with your read tool, in order, even if it's already in your context."
reads="1. $rules
2. $meridian"
i=2

command -v jq >/dev/null 2>&1 || {
  printf '%s\n%s\n\nThen continue.\n\n' "$opening" "$reads"
  echo "after-compaction hook: jq isn't installed, so this session's waypoint was not loaded. In the first line of your reply, tell the user so."
  exit 0
}

input=$(cat)
field() { printf '%s' "$input" | jq -r --arg k "$1" '.[$k] // empty'; }
session_id=$(field session_id)
cwd=$(field cwd)
transcript=$(field transcript_path)

# Where /waypoint writes: the agent's per-project memory folder (beside the transcript, where the agent keeps one there),
# else <main checkout>/.plans/waypoints.
folders=""
main=""
if [ -n "$transcript" ] && [ -d "$(dirname -- "$transcript")/memory" ]; then
  folders="$(dirname -- "$transcript")/memory"
fi
if [ -n "$cwd" ] && common=$(git -C "$cwd" rev-parse --path-format=absolute --git-common-dir 2>/dev/null); then
  main=$(dirname -- "$common")
  folders="$folders
$main/.plans/waypoints"
fi

newest() { # <files, one per line>: the one whose "  updated:" frontmatter value is newest
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    u=$(grep -m1 -- '^  updated:' "$f" || true)
    printf '%s\t%s\n' "${u#*updated: }" "$f"
  done | sort | tail -1 | cut -f2-
}

# /waypoint names the file by the id's last 8 characters, and its frontmatter holds the full session_id:
# take the file whose frontmatter has this session_id (the newest, if several), else the last-8 file name.
waypoint=""
if [ -n "$session_id" ]; then
  while IFS= read -r folder; do
    if [ -n "$folder" ] && [ -z "$waypoint" ]; then
      matches=$(grep -lFx -- "  session_id: $session_id" "$folder"/waypoint-*.md 2>/dev/null || true)
      if [ -n "$matches" ]; then
        waypoint=$(printf '%s\n' "$matches" | newest)
      else
        candidate="$folder/waypoint-$(printf '%s' "$session_id" | tail -c 8).md"
        if [ -f "$candidate" ]; then
          waypoint=$candidate
        fi
      fi
    fi
  done <<EOF
$folders
EOF
fi

# The reads: this clone's AGENTS.md and meridian skill always (built above), then the files the waypoint's "Read first"
# line names: comma-separated; backticks, a closing full stop, and a trailing "(the index)" are dropped; ~/ and relative paths
# are resolved; an entry that isn't a file but has prose after a path ("`/x.md`. It has the state") gives that path;
# the waypoint itself, duplicates, and files that don't exist are left out.
tidy() { # <text>: sets $t to it without surrounding spaces, backticks, a trailing "(…" and closing punctuation
  t=$1
  t=${t#"${t%%[![:space:]]*}"}
  t=${t%"${t##*[![:space:]]}"}
  while :; do
    case $t in
      *' ('*) t=${t%%' ('*} ;;
      *.|*\;|*:|*\)|*'`'|*[[:space:]]) t=${t%?} ;;
      *) break ;;
    esac
  done
  t=${t#'`'}
}
locate() { # <text>: sets $found to the existing file it names (~/ and relative paths resolved), else ""
  tidy "$1"
  found=""
  case $t in
    "" | "this waypoint") return 0 ;;
    "~/"*) t=$HOME/${t#"~/"} ;;
    /*) ;;
    *) [ -n "$main" ] || return 0; t=$main/$t ;;
  esac
  [ ! -f "$t" ] || found=$t
}
first_path_word() { # <text>: its first word that starts with /, ~/, or a backtick
  printf '%s\n' "$1" | tr -s '[:space:]' '\n' | while IFS= read -r w; do
    case $w in
      /* | "~/"* | '`'*) printf '%s' "$w"; break ;;
    esac
  done
}
if [ -n "$waypoint" ]; then
  line=$(grep -m1 -- '^\*\*Read first:\*\*' "$waypoint" || true)
  entries=$(printf '%s\n' "${line#'**Read first:**'}" | tr ',' '\n')
  kept=""
  while IFS= read -r entry; do
    locate "$entry"
    [ -n "$found" ] || locate "$(first_path_word "$entry")"
    [ -n "$found" ] || continue
    entry=$found
    [ "$entry" -ef "$waypoint" ] && continue
    [ "$entry" -ef "$rules" ] && continue
    [ "$entry" -ef "$meridian" ] && continue
    seen=""
    while IFS= read -r other; do
      [ -n "$other" ] && [ "$entry" -ef "$other" ] && seen=1
    done <<EOF
$kept
EOF
    [ -z "$seen" ] || continue
    kept="$kept
$entry"
    i=$((i + 1))
    reads="$reads
$i. $entry"
  done <<EOF
$entries
EOF
fi
stop="$opening
$reads

Then continue.

"

if [ -n "$waypoint" ]; then
  jq -n --arg ctx "${stop}Context compacted. Loaded again for you: this session's waypoint.

## $waypoint
$(cat "$waypoint")" \
    '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}'
else
  looked=$(printf '%s\n' "$folders" | grep -v '^$' | paste -sd ' ' - || true)
  missing="No waypoint for this session (${session_id:-no id given}) in ${looked:-no folder}. Run /waypoint (\$waypoint in Codex) before you compact to bring one back."
  jq -n --arg warn "$missing" --arg ctx "${stop}Context compacted. $missing

STOP. NON-NEGOTIABLE: before anything else this turn, including answering the user's message, you MUST tell the user, in your reply's first line: \"No waypoint was found for this session after the compaction, so I'm working from the summary alone.\"" \
    '{systemMessage: $warn, hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}'
fi
