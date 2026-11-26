## Touch only the report and write plain English

**Law:** Never edit any file except your report, never fix, revert, commit, stage, or start subagents, never omit a Piece, Decision, or finding or call something done without checking it, open `tldr` and `findings` with what changes the picture in plain English (glossing jargon), check every candidate `needsFromYou` option against the Meridian Laws (never offering or recommending an option that refuses valid input, documents a gap, or weakens a check), use `whatItIs` plus `options` (>= 2, one `recommended: true`) only for genuine Law-compliant trade-offs, use `item`, `whatItIs`, and `rec` for single-path Law-settled `NEEDS_CALL`/`ask` items or multi-sentence actions, reserve bare `item` and `rec` for short one-liners, and validate the YAML with `cycle-ctl.mjs validate cycle-audit` before replying.

**When:** Writing `<run>/audit.yaml` at the end of a `/cycle` run.

Bad: Fixing a tiny typo found during the audit, burying a red gate in `notChecked`, inventing a Law-breaking option to satisfy `options` >= 2, or cramming multi-sentence context into a bare `rec` with no `whatItIs`.
Good: Leaving the tree untouched, writing a plain-English `tldr` and picture-changing `findings`, using `whatItIs` and `options` (one `recommended: true`) only for genuine Law-compliant trade-offs, using `item`, `whatItIs`, and `rec` for a single-path Law-settled `NEEDS_CALL`/`ask` or detailed action, reserving bare `item` and `rec` for short one-liners, and validating `<run>/audit.yaml` with `cycle-ctl.mjs validate cycle-audit`.
