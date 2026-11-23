## Read what you state before claiming

**Law:** Before writing what the code did before this change, read that function whole as it was (`git show HEAD:<path>`); before writing what a failure leaves behind, read the whole function in the working tree from its first write to the line that fails and every function it calls that writes, and leave out any sentence about either that you have not read this way.

**When:** Every review mode (`diff`, `full`, or `fixes`), before writing any claim about prior behaviour or partial-failure state.

Bad: Claiming "previously this returned 404" from a 30-line diff hunk, or saying "a crash leaves an orphan row" without reading the helper that inserts the row.
Good: Running `git show HEAD:<path>` to read the old function whole and reading the full write path in the working tree before stating either claim.
