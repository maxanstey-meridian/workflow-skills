## Name neither module when neither needs the other

**Law:** When neither of two collaborating modules needs the other to keep its rules, neither names the other: the consumer declares a required port bridged by a host adapter.

**When:** Collaborating modules with no domain dependency (no arbitrary edge; each may store the other's opaque ids). If a pair keeps accumulating such ports, the boundary may be false — merge or redraw it first.

Bad: `Records` importing `Cases`' published query to show the Case a record belongs to.
Good: `Records` declaring a `CaseSummaries` port implemented by a host adapter over `Cases` (a manual record is still a record; a Case without a record is still a Case).
