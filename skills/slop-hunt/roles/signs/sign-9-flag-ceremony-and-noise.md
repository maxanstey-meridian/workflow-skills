## Sign 9: Flag ceremony and noise

**Default:** Flag comments that restate or no longer match the code, doc comments that repeat the signature or narrate history, logging that narrates the happy path, `async` with nothing to await, mapping layers that copy fields one-to-one, records that only carry a value from one call to the next, vague names (`Manager`, `Helper`, `Service`, `Support`, `utils`) used as dumping grounds, and barrel re-exports that hide where things live.

**When:** Reviewing comments, logs, pass-through wrappers, and names; apply the portability test: a comment or name that could move unchanged into an unrelated project carries no information about this one. Do not flag comments that say why, doc comments on a published package's public API that a consumer needs, or logging at a boundary that ops relies on.

Bad: Flagging a comment explaining a non-obvious upstream rate limit or XML doc comments on a published library's public method.
Good: Flagging a 120-line one-to-one mapper and `// save the form` comments that carry no project-specific meaning.
