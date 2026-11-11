# Defines `area <name> <regex>`: adds to areas.md a heading with the area's line count, then every file of
# sizes.txt whose path the regex matches. Load it from the run folder: cd "<run>" && . "<skill>/scripts/area.sh"
# This lives in a script because an agent may replace $0, $1, and so on in a SKILL.md with the command's arguments.

area() {
  n=$(p="$2" awk -F'\t' '$2 ~ ENVIRON["p"] {s+=$1} END{print s+0}' sizes.txt)
  { echo; echo "## $1 · $n"; p="$2" awk -F'\t' '$2 ~ ENVIRON["p"] {print "- " $2}' sizes.txt; } >> areas.md
}
