## Make valid input work, never refuse it

**Law:** When valid input breaks the code, make the input work; refusing it is not a fix.

**When:** Fixing a failure caused by input the product is meant to accept, on any stack.

Bad: A name with an apostrophe breaks the export, so validation now rejects apostrophes.
Good: The export escapes the name.
