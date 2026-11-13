#!/bin/sh
# Puts every path of fixed-<round>.txt that is in no slice file into one: the slice of the fixer whose
# `Changed files:` line names it (the first such fixer, when two name it), so a file a fixer made sits with
# the code it was made for; and slice-0.txt for a path no fixer of a slice names.
# Usage: sh slice-new-paths.sh <run folder> <round>
# This lives in a script because an agent may replace $0, $1, and so on in a SKILL.md with the command's arguments.

[ $# -eq 2 ] || { echo 'usage: sh slice-new-paths.sh <run folder> <round>' >&2; exit 2; }
run=$1
round=$2
fixed=$run/fixed-$round.txt
[ -f "$fixed" ] || { echo "slice-new-paths: $fixed is missing" >&2; exit 2; }

for report in "$run"/fix-"$round"-slice-*.md; do
  [ -f "$report" ] || continue
  n=${report##*/fix-"$round"-slice-}
  n=${n%.md}
  n=${n%-b}
  [ -f "$run/slice-$n.txt" ] || continue
  grep -h '^Changed files:' "$report" |
    awk '{sub(/^Changed files: /,""); n=split($0,a,", "); for(i=1;i<=n;i++) print a[i]}' |
    grep -Fxf "$fixed" |
    while IFS= read -r path; do
      grep -qFx -- "$path" "$run"/slice-*.txt || printf '%s\n' "$path" >> "$run/slice-$n.txt"
    done
done
cat "$run"/slice-*.txt | sort -u | comm -13 - "$fixed" >> "$run/slice-0.txt"
exit 0
