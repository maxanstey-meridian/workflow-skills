## Integrate modules through a port, contract, or kernel

**Law:** Two modules (feature folders under `Modules/` or `src/modules/`) work together in one of three ways only: a required port (the consumer's own type naming the capability it needs) bridged to the provider by a host adapter (an implementation in the host, which may depend on both sides); a published contract (the commands, queries, and types the provider deliberately exposes to other modules); or a shared kernel (a small concept both own and change only by agreement).

**When:** Any dependency between modules. Choose the consumer's port when the consuming use case should set the shape, the provider's published contract when it offers one stable capability to several consumers, and the shared kernel (in `Common`) only for a concept the modules really co-own. A required port does not move to `Common` because its adapter calls another module; each module depends only on the contract relevant to its own side.

Bad: Forms' use case importing `Submissions.Application.SubmissionService`.
Good: forms declaring a `SubmissionCounts` port that a host adapter implements by calling submissions' published query.
