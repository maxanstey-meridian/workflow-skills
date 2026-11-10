## Run scheduled work off-peak

**Default:** Pick a job's time from when its users work, not a round number: batch work (sweeps, reconciliation, rebuilds) runs outside working hours, and work whose result a person sees, such as an email, runs before their day starts, not at its start.

**When:** Any scheduled job.

Bad: The daily digest email scheduled for 09:00.
Good: The daily digest email scheduled for 06:30.
