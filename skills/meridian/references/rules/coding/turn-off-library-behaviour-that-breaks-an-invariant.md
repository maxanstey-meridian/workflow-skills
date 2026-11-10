## Turn off library behaviour that breaks an invariant

**Law:** Configure or disable any library behaviour that conflicts with an application invariant, especially hidden retries, transactions, caching, or background execution.

**When:** Adopting or configuring a library or SDK on any stack.

Bad: An HTTP client left on its default three retries for a non-idempotent payment POST.
Good: Retries disabled for that call.
