## Judge from the tree, never the fixer's claims

**Law:** Check the working tree against the `do: fix` findings in the review reports whose `file` is in `Files:` (or each failing check in `gate.log` for a gate fix) and against the spec when there is one; read the fixer's report only for which findings it marked `FIXED`, `NOT_FOUND`, `NEEDS_CALL`, or `OUT_OF_SLICE` and its `changedFiles` list, taking no claim from it.

**When:** Auditing any round of fixes for a slice or a gate fix.

Bad: Marking `F1` as `FIXED` because the fixer's report says `check: exit 0` without reading the diff or running the check yourself.
Good: Reading `git diff HEAD`, checking the fixer's report only for status values and `changedFiles`, and verifying every claim directly against the tree.
