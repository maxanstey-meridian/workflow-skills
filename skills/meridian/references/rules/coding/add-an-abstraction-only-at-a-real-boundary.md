## Add an abstraction only at a real boundary

**Default:** Add an interface, port, adapter, or other indirection only where there is a real boundary: I/O, plausible variability such as a second implementation, another owner, a runtime boundary, a dependency across modules, or a test that needs it.

**When:** Any stack, before introducing a layer. On the frontend this covers a page's `ports/`, `adapters/`, and provide/inject wiring: skip them when the component is presentational, the composable is small and clear, there is no real capability boundary, or no subtree wiring is needed.

Bad: An `IPriceCalculator` interface with one implementation over pure arithmetic.
Good: The function called directly.
