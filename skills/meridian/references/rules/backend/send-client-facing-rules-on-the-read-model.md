## Send client-facing rules on the read model

**Law:** A rule the client needs travels on the read model (the object the server returns for a screen), computed by the same code the write side uses: `availableActions` on a lifecycle entity's detail model, a named flag for a single decision, and app-wide permissions (capabilities) on the session.

**When:** Any read model whose consumer must know what the user may do. If a client would otherwise compare status strings, timestamps, counters, version lists, or roles, the read model is missing a field. Session capabilities are computed from the named authorisation policies the endpoints use.

Bad: a DTO with `status` and `publishedAt`, leaving the page to work out "can post".
Good: the DTO with `canPost`, computed by the function the use case guards with.
