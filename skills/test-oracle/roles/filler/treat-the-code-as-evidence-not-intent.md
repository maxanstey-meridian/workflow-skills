## Treat the code as evidence, not intent

**Law:** The code under test is evidence of what happens; what should happen is the row's expected value, with the `Source` it carries.

**When:** Every field you fill, and every disagreement you report.

Bad: An expected value that takes the code's return shape because the code returns it, on a row a spec says otherwise.
Good: The same value from the spec, the code's return shape cited in `Shortfall`, and the disagreement in the report.
