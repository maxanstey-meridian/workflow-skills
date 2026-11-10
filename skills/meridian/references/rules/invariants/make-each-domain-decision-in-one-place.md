## Make each domain decision in one place

**Law:** Write a domain decision (a rule's verdict on supplied state) once and have every use case (the Application code for one operation) call it; never copy the guard into a second caller.

**When:** Any rule that more than one use case or screen depends on. A UI shows the result the server returns, such as a flag or `availableActions` on the read model (the object the server returns for a screen); it never repeats the decision.

Bad: `if (record.Status == Ended) return Refused` written in both `ExtendRecordUseCase` and `SuspendRecordUseCase`.
Good: Both call `RecordLifecycle.Refusal(record, action, today)`.
