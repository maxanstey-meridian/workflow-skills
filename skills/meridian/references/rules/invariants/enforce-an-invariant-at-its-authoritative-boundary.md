## Enforce an invariant at its authoritative boundary

**Law:** The domain defines product invariants and an authoritative boundary enforces them; a controller, UI, AI prompt, comment, or test suite never owns an invariant.

**When:** Any product invariant. The authoritative boundary is where every write must pass: domain decision, DB constraint, or conditional write.

Bad: Enforcing "a published form cannot be edited" only by hiding the Edit button.
Good: Enforcing it via the use case's domain check and a conditional write so no caller can bypass it.
