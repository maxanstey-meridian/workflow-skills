## CQRS-Lite

Prefer CQRS-lite over repository-as-everything.

Repositories are primarily write-side consistency ports. They load the state
needed to perform a mutation and persist its result. Queries own read shapes:
list rows, dropdown options, exports, dashboards, and API projections belong to
named queries rather than the write repository.

Read-shaped repository methods (`Get`, `List`, `Find`, `Search`, `Read`,
`Query`, `Exists`, `Count`) are persistence-pure. They do not add, update,
delete, or save entities as a hidden consequence of reading. If an operation
intentionally reads and writes, give it a mutation-revealing name and treat it
as a command-side capability.

A trivial query may hydrate through a repository and map locally. If the read
becomes wider, slower, or UI-specific, replace the query implementation with a
direct projection without changing the write repository contract.

Mechanical review of this boundary is intentionally naming-based: repository
methods prefixed `Get`, `List`, `Find`, `Search`, `Read`, or `Query` and returning
`*Dto`, `*Row`, `*View`, `*Projection`, or `Paged*<...>` deserve ownership review.
That is a heuristic, not proof of leakage; mutation receipts and legitimate
Application-owned DTOs remain valid.

Use cases/commands orchestrate mutations. Policies make decisions. Transitions
transform state. Repositories load/save write-side state. Queries return
read-shaped data. Use explicit calls and dependencies; CQRS-lite does not
require MediatR, a command bus, or an ambient dispatcher.

Rules the client needs travel on the read model. A detail read model for a
lifecycle entity carries `availableActions`, computed by the same decider the
use cases guard with. A page needing a single server decision gets a named flag
(`canPost`, `hasUnpublishedChanges`) computed by the same function the write side
uses. App-wide permissions travel the same way: the session carries
capabilities computed from the named authorization policies the endpoints use.
If a client would otherwise compare status strings, timestamps, counters,
version lists or roles to work out what the user may do, the read model is
missing a field.
