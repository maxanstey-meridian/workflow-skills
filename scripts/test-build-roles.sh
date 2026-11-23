#!/bin/sh
# Tests that scripts/build-roles.sh accepts the clean tree and rejects flat role parts, malformed five-part role rules,
# cross-kind orphan parts, orphaned generated kind files, and over-budget generated kind files.

set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

base=$tmp/base
mkdir -p "$base/scripts"
cp "$repo/scripts/build-roles.sh" "$base/scripts/build-roles.sh"
tar -C "$repo" --exclude=node_modules -cf - skills | tar -C "$base" -xf -

new_sandbox() {
  sandbox=$tmp/$1
  cp -R "$base" "$sandbox"
}

expect_fail() {
  name=$1
  dir=$2
  want=$3
  err=$tmp/$name.err
  if sh "$dir/scripts/build-roles.sh" >/dev/null 2>"$err"; then
    echo "FAIL [$name]: build-roles.sh exited 0, expected non-zero" >&2
    exit 1
  fi
  if ! grep -Fq -- "$want" "$err"; then
    echo "FAIL [$name]: stderr did not contain '$want'" >&2
    cat "$err" >&2
    exit 1
  fi
}

# 0. Clean tree passes.
new_sandbox clean
if ! sh "$sandbox/scripts/build-roles.sh" >/dev/null 2>"$tmp/clean.err"; then
  echo "FAIL [clean]: build-roles.sh failed on clean tree" >&2
  cat "$tmp/clean.err" >&2
  exit 1
fi

# 1. Flat .md file directly under skills/spec/roles/ that IS referenced in roles.list.
new_sandbox flat-role
printf '# Flat role\n\nSome prose.\n' > "$sandbox/skills/spec/roles/flat-role.md"
awk '/^role cold-reader / { $0 = $0 ",flat-role" } { print }' "$sandbox/skills/spec/roles/roles.list" > "$sandbox/skills/spec/roles/roles.list.new"
mv "$sandbox/skills/spec/roles/roles.list.new" "$sandbox/skills/spec/roles/roles.list"
expect_fail flat-role "$sandbox" "skills/spec/roles/flat-role.md: role parts must live in a subfolder under roles/"

# 2. Role rule file breaking the five-part format.
new_sandbox bad-format
printf '## Broken rule\n\nJust prose with no strength line, When, Bad, or Good.\n' \
  > "$sandbox/skills/spec/roles/cold-reader/check-that-every-proof-can-fail.md"
expect_fail bad-format "$sandbox" "skills/spec/roles/cold-reader/check-that-every-proof-can-fail.md: line 3 does not start with"

# 3. Unused part in skills/oracle/kinds/cli/ whose filename appears in browser's kind line.
new_sandbox cross-kind-orphan
cp "$sandbox/skills/oracle/kinds/browser/track-unplaced-call-sites.md" \
  "$sandbox/skills/oracle/kinds/cli/track-unplaced-call-sites.md"
expect_fail cross-kind-orphan "$sandbox" "skills/oracle/kinds/cli/track-unplaced-call-sites.md: no line in kinds.list uses it"

# 4. Orphaned generated skills/oracle/kinds/orphan.md.
new_sandbox orphan-kind-file
printf '# Orphan kind\n' > "$sandbox/skills/oracle/kinds/orphan.md"
expect_fail orphan-kind-file "$sandbox" "skills/oracle/kinds/orphan.md: no line in kinds.list builds it"

# 5. Over-budget generated skills/oracle/kinds/cli.md.
new_sandbox kind-budget
perl -e 'print "x" x 61000, "\n"' >> "$sandbox/skills/oracle/kinds/cli/head.md"
expect_fail kind-budget "$sandbox" "skills/oracle/kinds/cli.md:"
grep -Fq -- "over the budget" "$tmp/kind-budget.err" || {
  echo "FAIL [kind-budget]: stderr did not mention over the budget" >&2
  cat "$tmp/kind-budget.err" >&2
  exit 1
}

echo "PASS: all 6 build-roles.sh tests passed"
