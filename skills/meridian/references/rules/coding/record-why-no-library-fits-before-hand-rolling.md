## Record why no library fits before hand-rolling

**Law:** When you hand-roll machinery, record the exact constraint that ruled out each established option.

**When:** Any change that adds custom general-purpose machinery after the library check failed.

Bad: A custom queue poller with no stated reason.
Good: The same poller with the constraint written down ("library X cannot order per tenant").
