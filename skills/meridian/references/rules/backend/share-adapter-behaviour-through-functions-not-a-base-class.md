## Share adapter behaviour through functions, not a base class

**Default:** When two adapters (implementations of a port) need the same behaviour, put it in pure functions in a shared file that both call, never in a base adapter class.

**When:** Adapters on a TypeScript backend.

Bad: `abstract class AbstractBaseMailer` extended by two mailers.
Good: `renderMessage(input)` in a shared file of pure functions that both mailers call.
