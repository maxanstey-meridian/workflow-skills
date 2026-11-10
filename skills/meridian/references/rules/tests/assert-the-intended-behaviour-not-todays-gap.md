## Assert the intended behaviour, not today's gap

**Law:** A test asserts the behaviour the product intends even when today's code fails it, and the gap is then fixed or reported as new work; never weaken the assertion to make it pass.

**When:** Writing or fixing a test that meets a known defect.

Bad: `expect(total).toBe(99)` because the rounding bug returns 99.
Good: `expect(total).toBe(100)`, with the red result reported.
