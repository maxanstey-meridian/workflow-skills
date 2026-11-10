## Test pure code directly

**Default:** Test a pure function (a transform, calculation, rule, validator, or mapping) directly, with no host, mount, or stand-in.

**When:** Any pure code. If testing a rule needs a large setup, move the rule into a pure function first.

Bad: a page mounted with half the app to check a label mapping.
Good: the mapping in `logic/` called with three inputs.
