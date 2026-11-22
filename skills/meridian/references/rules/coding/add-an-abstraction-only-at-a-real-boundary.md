## Add an abstraction only at a real boundary

**Default:** Add an interface, port, adapter, or indirection only at a real boundary: I/O, plausible variability (a second implementation), another owner, a runtime or cross-module boundary, or a test that needs it.

**When:** Any stack, before adding a layer — including frontend `ports/`, `adapters/`, and provide/inject wiring (skip when the component is presentational, the composable is small, or no subtree wiring is needed).

Bad: An `IPriceCalculator` interface with one implementation over pure arithmetic.
Good: Calling the function directly.
