## Seal every concrete class

**Default:** Mark every concrete C# type `sealed`.

**When:** C# code.

Bad: `public class CreateFormUseCase`
Good: `public sealed class CreateFormUseCase`
