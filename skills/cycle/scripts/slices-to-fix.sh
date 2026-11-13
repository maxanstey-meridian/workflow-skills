#!/bin/sh
# Gives every `do: fix` block of this round's review reports one slice file that holds all its paths, then
# prints each slice file a fixer must be started for.
# A block's paths are its heading path and the paths on its `- files:` line. For each block:
#   - the slice files that hold one of its paths are merged into the lowest-numbered of them (the others
#     are removed, and merged-<round>.txt records each merge), so one fixer owns every path of the fix;
#   - a path that is in no slice file, is not in left-out.txt, and exists in the tree is added to that slice.
# Writes hit-<round>.txt, every path a block names. Run it from inside the repo. Running it twice is safe.
# Usage: sh slices-to-fix.sh <run folder> <round>
# This lives in a script because an agent may replace $0, $1, and so on in a SKILL.md with the command's arguments.

[ $# -eq 2 ] || { echo 'usage: sh slices-to-fix.sh <run folder> <round>' >&2; exit 2; }
run=$1
round=$2
root=$(git rev-parse --show-toplevel) || { echo 'slices-to-fix: not inside a git repo' >&2; exit 2; }
[ -f "$run/left-out.txt" ] || { echo "slices-to-fix: $run/left-out.txt is missing" >&2; exit 2; }
blocks=$run/blocks-$round.txt
block=$run/block.txt

# One block per `do: fix` finding: its paths, one per line, then an empty line.
find "$run" -name "review-$round-*.md" -exec awk '
  /^### F[0-9]+ /{p=$0; sub(/^### F[0-9]+ /,"",p); sub(/:[0-9]+$/,"",p); f=""}
  /^- files: /{f=$0; sub(/^- files: /,"",f); gsub(/`/,"",f)}
  /^- do: fix$/{print p; n=split(f,a,", "); for(i=1;i<=n;i++) if(a[i]!="") print a[i]; print ""}
' {} + > "$blocks"

settle() {
  [ -s "$block" ] || return 0
  holders=$(grep -lFxf "$block" "$run"/slice-*.txt 2>/dev/null | sed 's/.*slice-\([0-9]*\)\.txt$/\1/' | sort -n)
  home=$(printf '%s\n' "$holders" | head -n 1)
  if [ -n "$home" ]; then
    for n in $(printf '%s\n' "$holders" | tail -n +2); do
      cat "$run/slice-$n.txt" >> "$run/slice-$home.txt" && rm "$run/slice-$n.txt" &&
        echo "slice-$n.txt into slice-$home.txt" >> "$run/merged-$round.txt"
    done
    grep -vFxf "$run/slice-$home.txt" "$block" | grep -vFxf "$run/left-out.txt" | sort -u |
      while IFS= read -r path; do
        [ -e "$root/$path" ] && printf '%s\n' "$path" >> "$run/slice-$home.txt"
      done
  fi
  : > "$block"
}

: > "$block"
while IFS= read -r line; do
  if [ -n "$line" ]; then printf '%s\n' "$line" >> "$block"; else settle; fi
done < "$blocks"
rm -f "$block"

grep -v '^$' "$blocks" | sort -u > "$run/hit-$round.txt"
grep -lFxf "$run/hit-$round.txt" "$run"/slice-*.txt
exit 0
