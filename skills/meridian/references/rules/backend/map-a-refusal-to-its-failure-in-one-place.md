## Map a refusal to its failure in one place

**Default:** Each decider (the one pure function that guards a lifecycle's actions) has one mapping from its refusal values to the declared failure, which owns the error codes and wording, and every use case (the Application code for one operation) goes through it instead of building the failure at the call site.

**When:** Use cases that guard with a decider.

Bad: `Result.Fail("Record has ended")` built in three use cases.
Good: `RecordFailures.From(refusal)` called by all three.
