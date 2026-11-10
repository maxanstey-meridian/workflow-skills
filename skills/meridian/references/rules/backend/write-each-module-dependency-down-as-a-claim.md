## Write each module dependency down as a claim

**Law:** The repo writes down each pair where one module (a feature folder under `Modules/` or `src/modules/`) can't keep its rules without another as a claim with its reason, and a module depends only on what it claims and, through those claims, on what they claim.

**When:** Any backend whose module dependencies a checker reads (Plumb reads `.plumb-modules.json`). Claim only the pairs where one module needs the other; modules that don't need each other stay unordered. A reference against the claims is wrong: replace it with a consumer-owned required port bridged at the host, or move a genuinely shared type to the shared kernel. A loop the claims don't explain is one question per pair: answer it, then add the claim, remove the reference, or merge or split the modules.

Bad: a claims file generated from the imports the code has today.
Good: `"Cases": { "CaseTypes": "a typed Case's stages, statuses, and permissions come from its pinned Case type version" }`, added by hand once the question was answered.
