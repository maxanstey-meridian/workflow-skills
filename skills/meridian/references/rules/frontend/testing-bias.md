## Testing Bias

Prefer:

- tests of pure `logic/`
- composable/page integration tests
- outcome-based behaviour tests

Avoid:

- mock-heavy tests that verify implementation detail only
- component tests that need large fake environment setup because boundaries were ignored
