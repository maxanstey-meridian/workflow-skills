## Decision Heuristics

### Should this become a new module?

Yes if:

- it is a real product capability
- it has its own language, workflow, or lifecycle
- it can be reasoned about as a bounded context

No if:

- it is only an infrastructure concern
- it is just a utility/helper
- it is an implementation detail of another module

### Should this become a port?

Yes if:

- it crosses I/O or infrastructure boundaries
- there is plausible variability
- the use case should not know implementation details

No if:

- it is pure computation
- it is incidental indirection
- the abstraction is wider than the actual capability

### Should this go in shared/common?

Yes if:

- it is genuinely cross-cutting
- it is a deliberately shared-kernel contract
- it is genuinely co-owned rather than required or published by one module

No if:

- it exists only because one module is leaking
- it would erase a meaningful feature boundary
