## A test id finds an element; the test asserts what the person sees

**Law:** A test id finds an element; the test then asserts what the person sees in it.

**When:** Every assertion on an element a test id found.

An attribute that carries a value from the server (a `data-` attribute holding a status, an outcome, or a state) is forbidden, to add and to assert on: the page can show the wrong thing and the test stays green. Where the only way to tell two states apart is such an attribute, say so in the report and assert what the person sees.

Bad: `expect(recordRow).toHaveAttribute("data-status", "Suspended")`.
Good: `expect(recordRow).toContainText("Suspended")` — the status as the page shows it.
