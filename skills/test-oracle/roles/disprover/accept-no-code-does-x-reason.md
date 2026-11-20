## Accept no code-does-X reason

**Law:** Never justify existing code, and never accept "the code does X" as a reason for a test to expect X, unless the row's expected value is a labelled `today` value that you have graded.

**When:** Every `Test` claim, and every expected value that rests on the code.

Bad: A CONFIRMED on a test that expects the code's current output, justified by "the code does X".
Good: The same test refused, with the expected value's `Source` named — not the code — and the row's expected value graded first.
