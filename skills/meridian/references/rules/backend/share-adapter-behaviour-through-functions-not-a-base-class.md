## Share adapter behaviour through functions, not a base class

**Default:** Share common behaviour across adapters via pure functions in a shared file, never a base adapter class.

**When:** Adapters on TypeScript backends.

Bad: `abstract class AbstractBaseMailer` extended by two mailers.
Good: `renderMessage(input)` in a shared pure file called by both mailers.
