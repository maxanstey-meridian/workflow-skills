## Send client-facing rules on the read model

**Law:** Compute every client-facing rule on the server using the write side's code and send it on the read model: `availableActions` on lifecycle details, named flags for single decisions, and app-wide permissions on the session.

**When:** Any read model whose client needs to know what is allowed. If a client would otherwise compare statuses, timestamps, counters, version lists, or roles, the read model is missing a field. Derive session capabilities from the same named authorisation policies endpoints enforce.

Bad: Sending `status` and `publishedAt` and letting the page compute `canPost`.
Good: Sending `canPost` computed by the same function the use case guards with.
