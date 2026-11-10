## Take validation limits from the DTO

**Law:** When the browser checks unsaved input for fast feedback, its limits and allowed choices come from the DTO (a `min`, a `max`, an allowed list), not from hand-copied constants or predicates; a constant that cannot travel on a DTO is held to the server's by a parity test.

**When:** Client-side validation in any UI. The server always checks again.

Bad: `const MAX_NAME = 80` in the form component.
Good: `:maxlength="form.limits.nameMax"`, with the limit read from the DTO.
