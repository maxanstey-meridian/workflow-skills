## Integrate modules through a port, contract, or kernel

**Law:** Modules (`Modules/` or `src/modules/`) interact only via: a consumer-owned required port bridged by a host adapter, a provider-owned published contract, or a co-owned shared kernel.

**When:** Any cross-module dependency. Use the provider's published contract only when the consumer could not keep its own rules without the provider; use a consumer port when it could (hiding the provider) or when the consumer should set the shape; use a shared kernel (in `Common`) only for a genuinely co-owned concept. Never move a required port to `Common` just because its adapter calls another module; each module depends only on its own side's contract.

Bad: Forms' use case importing `Submissions.Application.SubmissionService`.
Good: Forms declaring a `SubmissionCounts` port that a host adapter implements via Submissions' published query.
