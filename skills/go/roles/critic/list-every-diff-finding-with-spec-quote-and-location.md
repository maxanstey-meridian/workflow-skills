## List every diff finding with spec quote and location

**Law:** Inspect the whole diff and list every `Missing`, `Extra`, `Misunderstood`, and `Shrunk check` finding in one pass, quoting the spec's words and giving a `file:line` for each; raise no `Extra` finding for layout-only changes owned by the repo's formatter or for paths already dirty in `status-before.txt`.

**When:** Comparing a piece's diff against its spec Change, Proof, `owns:`, and Decisions — the builder gets only one retry, so omitting a finding fails the piece. **Missing:** asked for and absent (including an unhonoured Decision). **Extra:** in the diff and asked for by nothing. **Misunderstood:** built to a different meaning. **Shrunk check:** an assertion loosened, or a case dropped, skipped, or excluded.

Bad: Reporting only the first missing requirement, omitting the `file:line`, or flagging pre-existing edits on a path listed in `status-before.txt` as `Extra`.
Good: Listing every `Missing`, `Extra`, `Misunderstood`, and `Shrunk check` finding with the quoted spec requirement and exact `file:line`, skipping `Extra` for paths in `status-before.txt` and formatter-only layout changes.
