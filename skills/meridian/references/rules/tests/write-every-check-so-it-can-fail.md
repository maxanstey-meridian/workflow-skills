## Write every check so it can fail

**Law:** Compare a check's result with something the code under test did not produce; a check that cannot fail is a defect.

**When:** Every assertion, in any test or CI check.

Bad: `expect(format(x)).toBe(format(x))`
Good: `expect(format(new Date("2026-01-05"))).toBe("5 January 2026")`
