#!/bin/sh
# Sorts the paths that appeared during a /cycle run: a path a fixer's `Changed files:` line names whole
# goes to scope.txt, and any other goes to left-out.txt.
# Usage: sh sort-new-paths.sh <run folder> <fixed list> <fix report name pattern>
# This lives in a script because an agent may replace $0, $1, and so on in a SKILL.md with the command's arguments.

[ $# -eq 3 ] || { echo 'usage: sh sort-new-paths.sh <run folder> <fixed list> <fix report name pattern>' >&2; exit 2; }
run=$1
fixed=$2
name=$3
[ -f "$run/scope.txt" ] && [ -f "$run/left-out.txt" ] && [ -f "$fixed" ] || { echo "sort-new-paths: $run/scope.txt, $run/left-out.txt, or $fixed is missing" >&2; exit 2; }

find "$run" -name "$name" -exec grep -h '^Changed files:' {} + |
  awk '{sub(/^Changed files: /,""); n=split($0,a,", "); for(i=1;i<=n;i++) print a[i]}' > "$run/changed.txt"
grep -vFxf "$run/scope.txt" "$fixed" > "$run/unsorted.txt"
grep -Fxf "$run/changed.txt" "$run/unsorted.txt" >> "$run/scope.txt"
grep -vFxf "$run/changed.txt" "$run/unsorted.txt" >> "$run/left-out.txt"
exit 0
