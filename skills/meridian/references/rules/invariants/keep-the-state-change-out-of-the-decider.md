## Keep the state change out of the decider

**Default:** Put only the decision in the decider; keep the state change as a plain transform in the use case unless the transform itself is a rule.

**When:** Writing a lifecycle decider.

Bad: `RecordLifecycle.Apply(record, action)` both deciding and building the new record.
Good: The use case checking `Refusal`, then writing `record with { Status = Suspended }`.
