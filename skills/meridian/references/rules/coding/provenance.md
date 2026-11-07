## Provenance

Names and file boundaries should reveal what a thing really is.

Prefer:

- capability names
- concrete implementation names
- direct imports from the real owner
- explicit registration and wiring

Avoid:

- vague names like `manager`, `helper`, `service`, `provider`
- wrapper layers that hide the real dependency
- re-export structures that hide provenance
