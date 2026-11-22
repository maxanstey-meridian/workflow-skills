## Make each domain decision in one place

**Law:** Write a domain decision once and have every use case call it; never duplicate the guard in a second caller.

**When:** Any rule shared by multiple use cases or screens. The UI renders the server's answer (a flag or `availableActions` on the read model) and never repeats the decision.

Bad: `if (record.Status == Ended) return Refused` copied into `ExtendRecordUseCase` and `SuspendRecordUseCase`.
Good: Both calling `RecordLifecycle.Refusal(record, action, today)`.
