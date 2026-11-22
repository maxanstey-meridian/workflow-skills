## Pass state and time into a decider

**Default:** Pass plain state and time into a decider; it does no I/O (no clock, repository, or service) — load I/O facts first and pass them in.

**When:** Writing a lifecycle decider or any pure decision function.

Bad: `Refusal(recordId, action)` loading the record and calling `DateTime.UtcNow`.
Good: `Refusal(RecordState record, RecordAction action, DateOnly today)`.
