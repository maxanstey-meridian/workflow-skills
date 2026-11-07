## Use Cases vs Direct Services

Do not cargo-cult a use case class for every trivial operation.

Use a full use case when:

- the flow coordinates multiple side effects
- there is meaningful sequencing
- the capability matters enough to deserve a named orchestration boundary

If the behavior is genuinely simple and procedural, a direct service may be enough.

The key test:

- does this boundary improve clarity and protect business behavior?

If yes, keep it.
If not, simplify.
