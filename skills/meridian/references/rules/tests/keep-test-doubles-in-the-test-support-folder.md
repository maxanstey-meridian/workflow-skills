## Keep test doubles in the test support folder

**Preference:** Use one support folder for test doubles: `TestSupport/<Feature>/` in a .NET test project, and a lower-case `support/` folder inside a TypeScript test tree.

**When:** .NET test projects, and TypeScript test trees (`tests/support/`, `test/support/`).

Bad: `InMemoryFormRepository` declared at the bottom of `CreateFormTests.cs`.
Good: `TestSupport/Forms/InMemoryFormRepository.cs`
