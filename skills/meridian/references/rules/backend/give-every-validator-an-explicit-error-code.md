## Give every validator an explicit error code

**Default:** Give every failing FluentValidation validator its own `.WithErrorCode(...)` — default messages and validator names are not stable codes.

**When:** .NET with FluentValidation. Every validator in a chain needs its own code, including `SetValidator`, `ChildRules`, reusable custom extensions, and failures added inside `Custom`.

Bad: `RuleFor(x => x.Name).NotEmpty().MaximumLength(80).WithErrorCode("name.invalid")` (`NotEmpty()` has no code).
Good: `RuleFor(x => x.Name).NotEmpty().WithErrorCode("name.required").MaximumLength(80).WithErrorCode("name.too_long")`.
