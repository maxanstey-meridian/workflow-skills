## Use a maintained library before building machinery

**Law:** Do not hand-roll infrastructure, security protocols, wire clients, serialisation formats, schedulers, storage clients, authentication flows, locks, outboxes, queues, or dev tooling (comparators, parsers for standard formats, test harnesses) when a maintained library, framework feature, official SDK, or generated client meets the requirement; hand-roll only when none exists or a concrete hard requirement cannot be met, because avoiding one dependency is not a win when it leaves the application maintaining a private, incomplete version of a solved problem.

**When:** Before writing general-purpose machinery on any stack. Check the candidate against the real correctness, security, licensing, deployment, observability, failure, and retry requirements first.

Bad: A hand-written retry-with-backoff loop and job table.
Good: The framework's or an established library's scheduler, configured for the same job.
