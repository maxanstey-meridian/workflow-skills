## Read the test, and say what makes it red

**Law:** On a claim that "a test drives this" or "this test can fail", read the test: does it do what the row says, and assert the row's expected value, as the table holds it, and not a value read from the code at run time? Say what would make it go red.

**When:** Every claim about a test, in every pass.

Bad: A CONFIRMED on a test that asserts the code's own return value, so it can never go red.
Good: The same test read, the self-assertion quoted, and the claim WRONG with what the test would have to assert instead.
