## Default Bias

Prefer:

- pure logic unit tests
- integration and lifecycle tests at real seams
- architecture tests where boundaries matter
- outcome-based assertions

Avoid:

- tests that mirror implementation line-by-line
- mock-heavy tests of internal call sequences
- giant setup for small behaviour
- tests that break every time code is rearranged

For LLM-authored code especially, the safest default is:

- think through the behaviour
- write the real thing
- test the actual behaviour

Do not default to building the test around mocks first.
