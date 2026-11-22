## Use a smaller tool when no decider fits

**Default:** When any of a decider's four conditions fails (small closed state set, multiple state-dependent user actions, needed across multiple use cases and the UI, pure once I/O facts are loaded), use the smaller tool: an inline guard (+ read-model flag if the UI needs it) for one action in one place; a read-model flag for a single yes/no; a plain pure function for one decision with 1–2 callers and no action list; conditional writes/constraints for system-driven transitions; a closed type mirroring external states; or the DB alone when it expresses the whole rule.

**When:** Server domain code where a lifecycle decider was considered.

Bad: A `DeliveryLifecycle` decider for scheduler-driven retries.
Good: A conditional `UPDATE ... WHERE status = 'pending'`.
