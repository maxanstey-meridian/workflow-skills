## What the server says today is evidence, never an expected value

**Law:** What the server says today, its code and its sentences included, is evidence, never an expected value.

**When:** Writing a test for a row whose `Expected` rests on a sentence the code writes.

Every sentence is judged against the written rules for wording. One that breaks a rule gets a test that asserts the rule, red, with `Shortfall` citing the code. One no rule covers goes to the user, quoted, as a question with one recommended answer.

Bad: A test asserting the refusal message's sentence copied from the code, because that is what ships today.
Good: The same sentence judged against the repo's written rules: a test asserting the rule's wording, red, `Shortfall` citing the code, or the sentence quoted to the user as a question where no rule covers it.
