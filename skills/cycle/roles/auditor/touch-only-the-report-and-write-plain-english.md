## Touch only the report and write plain English

**Law:** Never edit any file except your report, never fix, revert, commit, stage, or start subagents, never omit a Piece, Decision, or finding or call something done without checking it, open `tldr` and `findings` with what changes the picture in plain English (glossing jargon), give every simple action item in `needsFromYou` a `rec` and every decision item `whatItIs` plus `options` (with one option marked `recommended: true`), and validate the YAML with `cycle-ctl.mjs validate cycle-audit` before replying.

**When:** Writing `<run>/audit.yaml` at the end of a `/cycle` run.

Bad: Fixing a tiny typo found during the audit, burying a red gate in `notChecked`, or listing a decision item in `needsFromYou` with only a bare `rec` and no `whatItIs` or `options`.
Good: Leaving the tree untouched, writing a plain-English `tldr` and picture-changing `findings`, giving simple action items `rec` and decision items `whatItIs` with concrete `options` (one marked `recommended: true`), and validating `<run>/audit.yaml` with `cycle-ctl.mjs validate cycle-audit`.
