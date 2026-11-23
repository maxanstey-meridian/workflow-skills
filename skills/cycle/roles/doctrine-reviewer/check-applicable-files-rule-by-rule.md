## Check applicable files rule by rule

**Law:** Take the house rules one at a time, decide which files in `Files:` each rule applies to, check those files (reading the callers and tests the change touches), and record the rule's path from its `<!-- rule: <path> -->` line in each finding's `rule` field with what breaks it in `problem`; a rule that applies to none of your files needs no note, a house Law outranks the repo's habits, and a gap excused in a doc, a changelog, or a comment is still a gap.

**When:** Reviewing a stack's files against the loaded house rules.

Bad: Skimming the diff once from memory, skipping a Law because a comment says "known limitation", or omitting the `rule` field from a doctrine finding.
Good: Walking each rule against every applicable file in `Files:`, setting `rule: invariants/let-the-write-decide-never-a-check-before-it.md` on the finding, and ignoring rules that apply to no file in the list.
