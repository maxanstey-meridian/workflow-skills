## Count a fake as coverage only above the port

**Default:** A test that uses a fake or a mock covers the behaviour above the port, never the adapter it replaced; prove arbitration, atomicity, ordering, redelivery, and lock loss through the real adapter.

**When:** Any test with a stand-in, and any claim about what a test covers. A port is the application-owned type that names a capability; an adapter implements it.

Bad: "Outbox delivery is covered" on the strength of a test with an in-memory publisher.
Good: that test described as covering the use case, plus an integration test of the real outbox adapter.
