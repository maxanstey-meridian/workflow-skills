#!/bin/sh
# Antigravity PreInvocation hook wrapper around hooks/after-compaction.sh.
# Antigravity has no compact SessionStart matcher: it writes a SYSTEM CHECKPOINT step into transcriptPath
# when context compacts. This wrapper watches for a new CHECKPOINT step_index (tracked in
# $artifactDirectoryPath/.after-compaction-step), translates Antigravity's camelCase stdin payload to
# after-compaction.sh's snake_case input, and wraps the resulting additionalContext into Antigravity's
# PreInvocation injectSteps output.
set -eu

repo=$(CDPATH= cd -P -- "$(dirname -- "$0")/.." && pwd)
after_compaction=$repo/hooks/after-compaction.sh

command -v jq >/dev/null 2>&1 || {
  printf '{}\n'
  exit 0
}

input=$(cat)
conversation_id=$(printf '%s' "$input" | jq -r '.conversationId // empty')
transcript=$(printf '%s' "$input" | jq -r '.transcriptPath // empty')
artifact_dir=$(printf '%s' "$input" | jq -r '.artifactDirectoryPath // empty')
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty')

if [ -z "$transcript" ] || [ ! -f "$transcript" ]; then
  printf '{}\n'
  exit 0
fi

checkpoint_line=$(grep '"type":"CHECKPOINT"' "$transcript" 2>/dev/null | tail -1 || true)
if [ -z "$checkpoint_line" ]; then
  printf '{}\n'
  exit 0
fi

checkpoint_step=$(printf '%s' "$checkpoint_line" | jq -r '.step_index // empty' 2>/dev/null || true)
if [ -z "$checkpoint_step" ]; then
  printf '{}\n'
  exit 0
fi

marker_dir=$artifact_dir
if [ -z "$marker_dir" ]; then
  marker_dir=$(dirname -- "$transcript")
fi
marker=$marker_dir/.after-compaction-step

if [ -f "$marker" ] && [ "$(cat "$marker" 2>/dev/null || true)" = "$checkpoint_step" ]; then
  printf '{}\n'
  exit 0
fi

# Never fire retroactively on an old compaction if the model has already responded since.
last_planner_line=$(grep '"type":"PLANNER_RESPONSE"' "$transcript" 2>/dev/null | tail -1 || true)
last_planner_step=$(printf '%s' "$last_planner_line" | jq -r '.step_index // empty' 2>/dev/null || true)
if [ -n "$last_planner_step" ] && [ "$last_planner_step" -gt "$checkpoint_step" ] 2>/dev/null; then
  mkdir -p "$marker_dir"
  printf '%s\n' "$checkpoint_step" > "$marker"
  printf '{}\n'
  exit 0
fi

mkdir -p "$marker_dir"
printf '%s\n' "$checkpoint_step" > "$marker"

payload=$(jq -n \
  --arg sid "$conversation_id" \
  --arg cwd "$cwd" \
  --arg tp "$transcript" \
  '{session_id: $sid, cwd: $cwd, transcript_path: $tp}')

out=$(printf '%s' "$payload" | sh "$after_compaction")
ctx=$(printf '%s' "$out" | jq -r '.hookSpecificOutput.additionalContext // empty' 2>/dev/null || true)
if [ -z "$ctx" ]; then
  ctx=$out
fi

if [ -z "$ctx" ]; then
  printf '{}\n'
  exit 0
fi

jq -n --arg ctx "$ctx" '{injectSteps: [{systemMessage: {systemMessage: $ctx}}]}'
