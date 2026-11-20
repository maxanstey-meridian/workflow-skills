## Justify no missing test, weak assertion, or shortcut

**Law:** Never justify a missing test, a weak assertion, or a shortcut: "it works today", "the builder chose", "another test covers it", and "it's consistent with other tests" are not reasons.

**When:** A row whose test is missing, weak, or reached by a shortcut.

Bad: "The builder chose to cover it in the suite test, so this row's `Test` is empty."
Good: `Empty` on the row's `Test`, with the missing test listed as a finding, and no reason offered.
