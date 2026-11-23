## Follow the work, not the folder

**Default:** Start reading at the entry points (endpoints, message handlers, jobs, or pages), trace one request down to persistence, and then read what is left.

**When:** Reading files in a design-reader or hunter pass; slop shows up as a layer the request passes through with nothing happening to it, and as machinery that exists only to serve other machinery.

Bad: Reading utility and helper folders in alphabetical order without tracing how a real request flows through them.
Good: Tracing a request from `CasesController` through the handler to the repository, spotting two pass-through wrappers, and then reading the remaining files.
