## Touch only the report and write plain English

**Law:** Never edit any file except your report, never fix, revert, commit, stage, or start subagents, never omit a Piece, Decision, or finding or call something done without checking it, open `tldr` and `findings` with what changes the picture in plain English (glossing jargon), include `rec` on every item in `needsFromYou`, and validate the YAML with `cycle-ctl.mjs validate cycle-audit` before replying.

**When:** Writing `<run>/audit.yaml` at the end of a `/cycle` run.

Bad: Fixing a tiny typo found during the audit, burying a red gate in `notChecked`, or listing a `needsFromYou` item with no `rec`.
Good: Leaving the tree untouched, writing a plain-English `tldr` and picture-changing `findings`, giving every `needsFromYou` item a clear `rec`, and validating `<run>/audit.yaml` with `cycle-ctl.mjs validate cycle-audit`.
