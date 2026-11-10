## Give every validator an explicit error code

**Default:** Every FluentValidation validator that can fail declares its own `.WithErrorCode(...)`, because a message or the validator-name default is not a stable code.

**When:** .NET with FluentValidation. In a chain each validator has its own code; rules reached through `SetValidator` or `ChildRules`, and reusable custom validator extensions, own theirs; a `Custom` callback sets the code on each failure it adds.

Bad: `RuleFor(x => x.Name).NotEmpty().MaximumLength(80).WithErrorCode("name.invalid")`, where `NotEmpty()` has no code of its own.
Good: `RuleFor(x => x.Name).NotEmpty().WithErrorCode("name.required").MaximumLength(80).WithErrorCode("name.too_long")`.
