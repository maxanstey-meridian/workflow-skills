## Return Domain outcomes as closed Domain types

**Default:** Return a closed Domain decision's outcomes as its own result record or sealed type — never an exception or general-purpose `Result` (FluentResults or custom).

**When:** Domain code on .NET or TypeScript (including lifecycle decider refusals).

Bad: A Domain method returning `Result.Fail("ended")`.
Good: `RecordRefusal? Refusal(…)` returning `RecordRefusal.Ended`.
