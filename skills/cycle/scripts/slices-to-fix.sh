#!/bin/sh
# Writes hit-<round>.txt, the paths a `do: fix` block of this round's review reports names, and prints
# each slice file that holds one of them.
# Usage: sh slices-to-fix.sh <run folder> <round>
# This lives in a script because an agent may replace $0, $1, and so on in a SKILL.md with the command's arguments.

[ $# -eq 2 ] || { echo 'usage: sh slices-to-fix.sh <run folder> <round>' >&2; exit 2; }
run=$1
round=$2

find "$run" -name "review-$round-*.md" -exec awk '
  /^### F[0-9]+ /{p=$0; sub(/^### F[0-9]+ /,"",p); sub(/:[0-9]+$/,"",p)}
  /^- do: fix$/{print p}
' {} + | sort -u > "$run/hit-$round.txt"
grep -lFxf "$run/hit-$round.txt" "$run"/slice-*.txt
exit 0
