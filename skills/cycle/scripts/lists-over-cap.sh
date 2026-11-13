#!/bin/sh
# Prints each slice file and stack file of a run that holds more than 25 paths, with its count.
# Prints nothing when every one is within the cap.
# Usage: sh lists-over-cap.sh <run folder>
# This lives in a script because an agent may replace $0, $1, and so on in a SKILL.md with the command's arguments.

[ $# -eq 1 ] || { echo 'usage: sh lists-over-cap.sh <run folder>' >&2; exit 2; }
run=$1

for list in "$run"/slice-*.txt "$run"/stack-*.txt; do
  [ -f "$list" ] || continue
  count=$(grep -c '' "$list")
  [ "$count" -gt 25 ] && echo "$count $list"
done
exit 0
