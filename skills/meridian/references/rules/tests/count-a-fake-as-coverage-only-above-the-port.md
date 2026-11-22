## Count a fake as coverage only above the port

**Default:** A test using a fake or mock covers only behaviour above the port, never the replaced adapter; prove arbitration, atomicity, ordering, redelivery, and lock loss through the real adapter.

**When:** Any test with a double and any coverage claim.

Bad: Claiming "outbox delivery is covered" from a test using an in-memory publisher.
Good: Counting that test as use-case coverage, plus an integration test on the real outbox adapter.
