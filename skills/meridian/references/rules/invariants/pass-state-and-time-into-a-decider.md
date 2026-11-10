## Pass state and time into a decider

**Default:** A decider takes plain state and the time as arguments and does no I/O, so it reads no clock, repository, or service, and facts that need I/O are loaded first and passed in.

**When:** Writing a decider (the one pure function that guards a lifecycle's actions) or any pure decision function.

Bad: `Refusal(recordId, action)` that loads the record and calls `DateTime.UtcNow`.
Good: `Refusal(RecordState record, RecordAction action, DateOnly today)`.
