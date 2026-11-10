## Keep the state change out of the decider

**Default:** Formalise only the decision; the state change stays a plain transform in the use case unless the transform is itself a rule.

**When:** Writing a decider (the one pure function that guards a lifecycle's actions); the use case is the Application code for one operation.

Bad: `RecordLifecycle.Apply(record, action)` that both decides and builds the new record.
Good: The use case checks `Refusal`, then writes `record with { Status = Suspended }`.
