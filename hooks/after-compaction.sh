#!/bin/sh
# Runs after a compaction: puts this session's waypoint back into context and orders the reads its "Read first" line names.
# AGENTS.md 'Routines' says to read them; this makes it happen without the agent remembering to.
# Input: the hook's JSON on stdin, with session_id and cwd, and transcript_path where the agent gives one.
# Output: JSON with the text for the agent's context, and a message for the user when no waypoint is found.
# Why it shouts: as of November 2026, frontier models ignored a plain "read these files before anything else" after a
# compaction, even when the summary named it as the next step (after none of 40 such compactions did the agent load
# the files itself). The "STOP. NON-NEGOTIABLE" list, last in context, was the first wording one obeyed. Don't soften it.
set -eu

input=$(cat)
field() { printf '%s' "$input" | jq -r --arg k "$1" '.[$k] // empty'; }
session_id=$(field session_id)
cwd=$(field cwd)
transcript=$(field transcript_path)

# Where /waypoint writes: the agent's per-project memory folder (beside the transcript, where the agent keeps one there),
# else <main checkout>/.plans/waypoints.
folders=""
if [ -n "$transcript" ]; then
  folders="$(dirname -- "$transcript")/memory"
fi
if [ -n "$cwd" ] && common=$(git -C "$cwd" rev-parse --path-format=absolute --git-common-dir 2>/dev/null); then
  folders="$folders
$(dirname -- "$common")/.plans/waypoints"
fi

# /waypoint names the file by the id's last 8 characters, but sessions don't always do that:
# take the file whose frontmatter has this session_id, else the last-12 or last-8 file name.
waypoint=""
if [ -n "$session_id" ]; then
  while IFS= read -r folder; do
    if [ -n "$folder" ] && [ -z "$waypoint" ]; then
      waypoint=$(grep -l -- "^  session_id: $session_id\$" "$folder"/waypoint-*.md 2>/dev/null | head -1 || true)
      for n in 12 8; do
        candidate="$folder/waypoint-$(printf '%s' "$session_id" | tail -c "$n").md"
        if [ -z "$waypoint" ] && [ -f "$candidate" ]; then
          waypoint=$candidate
        fi
      done
    fi
  done <<EOF
$folders
EOF
fi

if [ -n "$waypoint" ]; then
  # The files the waypoint's "Read first" line names, as one explicit list (the waypoint itself is already here).
  reads=""
  i=0
  for file in $(grep -m1 -- '^\*\*Read first:\*\*' "$waypoint" | grep -o -- '/[^ ,]*'); do   # not $path: zsh ties it to PATH
    if [ "$file" != "$waypoint" ]; then
      i=$((i + 1))
      reads="$reads
$i. $file"
    fi
  done
  stop=""
  if [ -n "$reads" ]; then
    stop="STOP. NON-NEGOTIABLE: before anything else this turn, including answering the user's message, read each of these files with your read tool, in order:
$reads

Then continue.

"
  fi
  jq -n --arg ctx "${stop}Context compacted. Loaded again for you: this session's waypoint.

## $waypoint
$(cat "$waypoint")" \
    '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}'
else
  looked=$(printf '%s\n' "$folders" | grep -v '^$' | paste -sd ' ' - || true)
  missing="No waypoint found for session ${session_id:-(no id given)} in ${looked:-no folder} (looked for its session_id, and for waypoint-<last 12>.md and waypoint-<last 8>.md)."
  jq -n --arg warn "$missing" --arg ctx "Context compacted. $missing

STOP. NON-NEGOTIABLE: before anything else this turn, including answering the user's message, you MUST tell the user, in your reply's first line: \"No waypoint was found for this session after the compaction, so I'm working from the summary alone.\"" \
    '{systemMessage: $warn, hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}'
fi
