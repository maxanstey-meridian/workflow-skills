## Give every different outcome a test

**Default:** Every materially different outcome a change introduces has evidence at the cheapest honest level; several code branches that produce one outcome do not each need a test, and covering the wiring does not cover the use case (the Application code for one operation) behind it.

**When:** Any change that adds behaviour.

Bad: a new endpoint with one happy-path test.
Good: tests for the endpoint's 404, 422, and success outcomes.
