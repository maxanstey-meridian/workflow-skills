## Write Empty only when you cannot fill

**Default:** An `Empty` record says what stopped you, and you write it only when you could not fill the field and it is not a question.

**When:** A field that is neither a value nor a question.

Bad: `Empty: no time` on a field a source answers, where the filler would have read the source.
Good: `Empty: the route is built behind a flag I cannot read from the repo, and the flag's default is not in the tree`, on the field that is genuinely unfillable.
