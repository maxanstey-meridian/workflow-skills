## Name neither module when neither needs the other

**Law:** When each of two modules (feature folders under `Modules/` or `src/modules/`) could keep its rules if the other had never been built, neither names the other: the one that uses the other's data or behaviour owns a required port (its own type naming the capability it needs), bridged at the host.

**When:** Two modules that work together though neither needs the other. This is the only case where a direction would be arbitrary, and the answer is no edge, not a chosen one. Each may still store the other's ids as opaque values. When one pair keeps needing more of these ports, the boundary may be false: merge the modules or redraw it before adding another port.

Bad: Records importing Cases' published query to show the Case a record was issued on.
Good: Records declaring a `CaseSummaries` port that a host adapter implements from Cases, since a record issued by hand is still a record and a Case with no record is still a Case.
