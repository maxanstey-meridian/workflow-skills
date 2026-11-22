## The sweep

**Law:** After the build, list every one of the hard rules' forbidden items in the test file and its helpers, with file, line, and what it is used for — including an assertion on a server-valued attribute in place of what the person sees, and a `request` call that does what the source says a person does, and a screen the repo's other journeys leave a record of, that this test leaves none for.

**When:** After the build, over every test file of the case and its helpers.

Bad: A sweep that names the `force` uses in the spec and nothing else.
Good: A sweep listing each `force` and `.first()` use, the `request` call that seeds what the person should create, and the screen the repo's journeys photograph that the case's test leaves none for — each with file, line, and use.
