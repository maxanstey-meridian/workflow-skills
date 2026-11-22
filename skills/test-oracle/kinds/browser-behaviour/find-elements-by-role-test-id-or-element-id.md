## Find elements by role, test id, or element id

**Law:** Find elements by role, test id, or element id, inside the container they belong to.

**When:** Writing every locator in a browser test.

Bad: A locator keyed on a styling class the design system happens to emit, scoped to nothing.
Good: The Suspend button found by role inside the record's status card.
