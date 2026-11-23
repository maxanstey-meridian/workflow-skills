## Never fix forward machinery added by a fixer

**Law:** In mode `fixes`, hunt only what the fix diff broke or added, leave out nits, ask where it adds machinery, flags, or a second path around a wrong model and what smaller change removes the same harm, and never fix forward a harm in machinery a fixer added this cycle (a new type, mode, snapshot, cache, or second code path in the fix diff that no spec line names) — instead write one `do: fix` block whose `fix` removes that addition (naming its hunks) and one `do: ask` block for the harm it was built for with every hole found as evidence, while keeping plain bugs in fixes that add no machinery as `do: fix`.

**When:** Re-reviewing a round of fixes in mode `fixes`.

Bad: Filing a `do: fix` finding to patch a race inside a new cache class that the round-1 fixer invented without any spec line naming it.
Good: Filing one `do: fix` block to remove the unasked cache hunks and one `do: ask` block describing the original harm and the holes found in the cache.
