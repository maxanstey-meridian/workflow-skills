## Fill Shortfall where the code falls short

**Law:** `Shortfall` is what today's code does where it falls short of the row's expected value, cited, and you fill it where today's code does not give the row's expected value, whether the value rests on a written source, a ruling, a Meridian rule, or judgement: a row with a confirmed `Shortfall` expects a red test, and every other row expects a green one, and a row whose expected value is `today` has no shortfall.

**When:** A row whose expected value the code under test does not give.

Bad: A `Shortfall` that says "the code differs" without the code's sentence, so the red test has nothing to fail against.
Good: `Shortfall` with the code cited — the sentence it actually returns — beside the expected value the source gives.
