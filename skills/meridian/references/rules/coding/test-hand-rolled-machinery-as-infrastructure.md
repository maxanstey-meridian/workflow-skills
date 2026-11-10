## Test hand-rolled machinery as infrastructure

**Law:** Test custom general-purpose machinery as infrastructure, not as incidental helper code.

**When:** Any change that adds custom general-purpose machinery after the library check failed.

Bad: A custom queue poller with no tests of its own.
Good: Integration tests of the poller itself.
