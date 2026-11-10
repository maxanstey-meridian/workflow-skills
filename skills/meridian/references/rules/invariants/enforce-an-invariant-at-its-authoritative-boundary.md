## Enforce an invariant at its authoritative boundary

**Law:** The domain decides what an important product invariant is, and an authoritative boundary enforces it; a controller, a UI, an AI model or its prompt, a comment, or a test suite never decides what the invariant is.

**When:** Any product invariant (a rule the product must always keep true). The authoritative boundary is the place every write must pass: the domain decision, the constraint, or the conditional write.

Bad: "A published form cannot be edited" kept only by the page hiding the Edit button.
Good: The same rule kept by the use case's domain check and a conditional write, so no caller can get past it.
