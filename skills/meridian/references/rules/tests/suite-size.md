## Suite Size

Every test costs run time and upkeep, so each one earns its place by proving
behaviour nothing else proves, at the cheapest level that proves it (see `tests/risk-and-test-shape.md`). New behaviour gets a test; extend an existing test before
writing a new one. No tests that pin wording, styling, colour, or layout; what
the user can see or do (a message shown, a section revealed) is behaviour. A change that
makes a test redundant deletes it in the same change.
