## Treat the code as evidence, not intent

**Law:** The code under test is evidence of what happens; what should happen is the row's expected value, with the `Source` it carries — and where the code and a written source, a ruling, or a Meridian rule disagree, say so on the row and in your report, what the source says and what the code does with a citation for both, unsoftened and unexplained-away.

**When:** Every field you fill, and every disagreement you report.

Bad: An expected value that takes the code's return shape because the code returns it, on a row a spec says otherwise.
Good: The same value from the spec (cited), the code's return shape cited in `Shortfall`, and the disagreement in the report: the spec says X, the code returns Y, the test asserts X and is red.
