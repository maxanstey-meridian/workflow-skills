## Cross-check protections before keeping a finding

**Law:** For every finding that removes or weakens a protection, confirm that its named remaining protection is not removed or changed by any other finding, merge findings whose proofs depend on each other into one finding, and drop any finding whose protection has no named successor unless it is a `judgement` finding dropping that behaviour on purpose (naming the tests that change with it).

**When:** Cross-checking settled findings across reports in the reporter pass (for example, when B is dead only once A goes, or an inner check is redundant only while an outer check stays).

Bad: Keeping both a finding that deletes an outer validator and a separate finding that deletes an inner guard relying on that outer validator.
Good: Merging dependent removals into one finding, and dropping any finding that leaves a kept behaviour unprotected.
