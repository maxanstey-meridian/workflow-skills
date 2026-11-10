## Use a smaller tool when no decider fits

**Default:** When one of a decider's four conditions fails (a small closed set of states, several user actions depending on it, an answer needed in several use cases and on the page, a decision that is pure once the facts that need I/O are loaded and passed in), use the smaller tool: an inline guard, plus a flag on the read model (the object the server returns for a screen) if the page needs it, for one action guarded in one place, a flag on the read model for one yes-or-no, a plain pure decision function for one decision with one or two callers and no action list, conditional writes and constraints for transitions the system drives, a closed type that mirrors an external system's states, or the database alone when it already expresses the whole rule.

**When:** Server domain code where a decider (the one pure function that guards a lifecycle's actions) was considered.

Bad: A `DeliveryLifecycle` decider for retries that the scheduler drives.
Good: A conditional `UPDATE ... WHERE status = 'pending'`.
