## Match the test level to the failure risk

**Default:** Choose the test by what could go wrong: a focused unit test for a pure decision, a behaviour test through ports (the application-owned types that name capabilities) for orchestration, a real-adapter integration test (an adapter is the implementation of a port) for persistence or protocol, a host or page composition test for wiring, and a few end-to-end tests for critical journeys; follow no fixed pyramid or branch-coverage quota.

**When:** Deciding what kind of test a change needs.

Bad: an end-to-end browser test for a discount calculation.
Good: a unit test of the pure discount function.
