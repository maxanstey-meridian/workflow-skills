#!/bin/sh
# Writes sizes.txt, one `<lines><tab><path>` line per file of scope.txt, and prints the 15 biggest.
# Usage: sh sizes.sh <root> <run folder>
# This lives in a script because an agent may replace $0, $1, and so on in a SKILL.md with the command's arguments.

[ $# -eq 2 ] || { echo 'usage: sh sizes.sh <root> <run folder>' >&2; exit 2; }
root=$1
run=$2

cd "$root" || exit 1
tr '\n' '\0' < "$run/scope.txt" | LC_ALL=en_US.UTF-8 xargs -0 wc -l |
  awk '{n=$1; sub(/^ *[0-9]+ /,""); if ($0!="total") print n "\t" $0}' > "$run/sizes.txt"
sort -rn "$run/sizes.txt" | head -15
