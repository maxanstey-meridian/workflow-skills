## Return Domain outcomes as closed Domain types

**Default:** A Domain decision (a rule's verdict on supplied state) with a closed set of meaningful outcomes returns its own result record or sealed outcome type, never an exception and never a general-purpose result type such as FluentResults or a hand-rolled `Result`.

**When:** Domain code on .NET or TypeScript. A decider's refusal (the decider is the one pure function that guards a lifecycle's actions) is such an outcome.

Bad: A Domain method returning `Result.Fail("ended")`.
Good: `RecordRefusal? Refusal(…)` returning `RecordRefusal.Ended`.
