## Map a refusal to its failure in one place

**Default:** Give each decider one central mapper from refusal values to declared failures (owning error codes and wording), and route every use case through it instead of building failures at call sites.

**When:** Use cases guarding with a decider.

Bad: Building `Result.Fail("Record has ended")` in three use cases.
Good: Calling `RecordFailures.From(refusal)` in all three.
