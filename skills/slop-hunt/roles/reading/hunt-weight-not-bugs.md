## Hunt weight, not bugs

**Default:** Look for unearned weight rather than defects: record any bug you trip over as one line under `Also noticed` with its `file:line` (and no proof, history, or fix work) and do not hunt for more, while reporting any broken house Law covered by a sign as a finding under that sign with its proof.

**When:** Reading code during a hunt.

Bad: Spending half the pass chasing edge-case bugs or burying a UI re-derived server rule under `Also noticed`.
Good: Recording a tripped-over off-by-one bug as one line under `Also noticed` and reporting a UI re-derived rule under sign 5 with full proof.
