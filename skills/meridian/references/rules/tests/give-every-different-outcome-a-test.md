## Give every different outcome a test

**Default:** Test every materially different outcome at the cheapest honest level; multiple branches yielding one outcome don't each need a test, and wiring tests don't cover the use case behind them.

**When:** Any change adding behaviour.

Bad: A new endpoint with only a happy-path test.
Good: Tests covering the endpoint's 404, 422, and success outcomes.
