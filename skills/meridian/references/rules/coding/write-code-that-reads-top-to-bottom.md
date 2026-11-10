## Write code that reads top to bottom

**Default:** Write a procedure as statements in the order they run, so a reader understands each line without holding an abstraction in their head.

**When:** Scripts and orchestration code on any stack.

Bad: A build script as a registry of step objects run by a generic pipeline.
Good: The same steps as six statements in order.
