## Comment only to explain why

**Default:** Write a comment only to explain why: a constraint that is not obvious, a design decision, or a real trap; never to restate what the code says, and when in doubt leave it out.

**When:** Any code on any stack.

Bad: `// loop over the items` above a `for`.
Good: `// the API returns newest first, so stop at the first seen id`.
