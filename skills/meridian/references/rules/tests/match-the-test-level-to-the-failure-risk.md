## Match the test level to the failure risk

**Default:** Match test level to failure risk — unit test for pure decisions, behaviour test through ports for orchestration, real-adapter integration test for persistence/protocol, composition test for wiring, and a few end-to-end tests for critical journeys; follow no fixed pyramid or coverage quota.

**When:** Choosing what test a change needs.

Bad: An end-to-end browser test for a discount calculation.
Good: A unit test of the pure discount function.
