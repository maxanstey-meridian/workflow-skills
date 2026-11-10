## Never write in a read-named repository method

**Default:** A repository method whose name starts with `Get`, `List`, `Find`, `Search`, `Read`, `Query`, `Exists`, or `Count` never adds, updates, deletes, or saves; an operation that reads and writes gets a name that says so.

**When:** Repository methods on .NET or TypeScript.

Bad: `GetOrCreateDraftAsync` hidden behind the name `GetDraftAsync`.
Good: `EnsureDraftAsync`.
