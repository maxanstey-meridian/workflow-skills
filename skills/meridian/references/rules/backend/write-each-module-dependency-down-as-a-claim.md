## Write each module dependency down as a claim

**Law:** Record every pair where one module cannot keep its rules without another as an explicit claim with its reason, and depend only on claimed modules (and transitively on what they claim).

**When:** Any backend with a module-dependency checker (Plumb reads `.plumb-modules.json`). Claim only true domain dependencies; leave independent modules unordered. Fix unclaimed references via a consumer-owned port bridged at the host or a genuinely shared kernel. Resolve unexplained cycles pair by pair: add the claim, break the edge, or merge/split the modules.

Bad: Generating a claims file from today's imports.
Good: Hand-writing `"Cases": { "CaseTypes": "a typed Case's stages, statuses, and permissions come from its pinned Case type version" }`.
