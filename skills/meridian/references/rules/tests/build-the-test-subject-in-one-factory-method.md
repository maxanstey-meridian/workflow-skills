## Build the test subject in one factory method

**Preference:** Use a private `CreateUseCase()` factory in each test class to build the subject under test.

**When:** .NET test classes for use cases (the Application code for one operation).

Bad: `new CreateFormUseCase(repo, clock, mailer)` repeated in every test method.
Good: one `private CreateFormUseCase CreateUseCase()` that every test method calls.
