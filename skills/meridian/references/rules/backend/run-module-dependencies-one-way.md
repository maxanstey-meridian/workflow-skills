## Run module dependencies one way

**Law:** Dependencies between modules (feature folders under `Modules/` or `src/modules/`) form a one-way graph, so no module reaches itself by following them; a loop is a gap to fix, and no decision record or accepted cost stands in for its fix.

**When:** Any backend with more than one module. The integration rule says how two modules talk; this one says which of the two may name the other. A loop made only of edges from a module to one it can't keep its rules without means the modules on it need each other, which makes them one concept split across modules; every other loop holds at least one edge between two modules where neither needs the other. The split, or that edge, is the one to fix.

Bad: Cases reading CaseTypes' versions and CaseTypes reading Cases' open count, with a decision record that accepts the loop.
Good: Cases depending on CaseTypes, and CaseTypes taking the count through its own `OpenCaseCounts` port, bridged at the host.
