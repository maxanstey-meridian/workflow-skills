## Use a maintained library before building machinery

**Law:** Do not hand-roll infrastructure, security protocols, wire clients, serialisation, schedulers, storage clients, auth flows, locks, outboxes, queues, or dev tooling (comparators, standard-format parsers, test harnesses) when a maintained library, framework feature, official SDK, or generated client fits; hand-roll only when none exists or a hard requirement cannot be met.

**When:** Before writing general-purpose machinery on any stack. Evaluate candidates against correctness, security, licensing, deployment, observability, failure, and retry requirements first.

Bad: A hand-written retry-with-backoff loop and job table.
Good: The framework's or an established library's scheduler, configured for the same job.
