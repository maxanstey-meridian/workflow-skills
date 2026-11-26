## Use a maintained library before building machinery

**Law:** Do not hand-roll infrastructure, security protocols, wire clients, serialisation, standard-format parsers, schema or specification validators, general-purpose runtime or reflection engines, schedulers, storage clients, auth flows, locks, outboxes, queues, or dev tooling (comparators, test harnesses) in product code, libraries, or dev tooling when a maintained library, framework feature, official SDK, or generated client fits; hand-roll only when none exists or a hard requirement cannot be met.

**When:** Before writing general-purpose machinery in product code, libraries, or dev tooling on any stack. Evaluate candidates against current maintained major versions and active alternatives — never ruling a library out on an older major version alone — and against correctness, security, licensing, deployment, observability, failure, and retry requirements first.

Bad: A hand-written retry-with-backoff loop and job table, or a hand-rolled OpenAPI parser or JSON Schema validator.
Good: The framework's or an established library's scheduler, parser, or schema validator, configured for the same job.
