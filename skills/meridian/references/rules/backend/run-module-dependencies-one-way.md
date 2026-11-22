## Run module dependencies one way

**Law:** Module dependencies form a directed acyclic graph (no module reaches itself); a cycle is a gap to fix, never an accepted cost or decision record.

**When:** Any multi-module backend. A cycle of true domain dependencies means those modules are one concept split across folders; any other cycle contains a non-essential edge to break via a consumer-owned port bridged at the host.

Bad: `Cases` reading `CaseTypes` versions and `CaseTypes` reading `Cases` open count, with a decision record accepting the cycle.
Good: `Cases` depending on `CaseTypes`, and `CaseTypes` reading the count through an `OpenCaseCounts` port bridged at the host.
