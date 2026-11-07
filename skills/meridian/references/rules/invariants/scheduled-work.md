## Scheduled Work

**Default:** scheduled work runs off-peak and spread out.

- Pick a job's time from when its users work, not a round number. Batch work
  (sweeps, reconciliation, rebuilds) runs outside working hours. Work whose
  result a person sees, such as an email, runs before their day starts, not at
  its start, when staff are signing in and the system is busiest.
- Never start every tenant's or subject's job at the same instant. Offset each
  one by a stable hash of its id across a window, so the load spreads and a
  rerun keeps the same slot.
- A job's time is a named constant, in the zone its users live in, with a
  comment saying why it runs then.
