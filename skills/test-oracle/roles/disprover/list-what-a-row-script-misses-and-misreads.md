## List what a row script misses and misreads

**Default:** When the brief points you at a row script instead of a fill report, you read the row script — the program named by the `rows` command in `oracle.conf.json` in the case folder, which may sit in the case folder or be shared — and what the rows are read from, and you list what the script misses, what it misreads, and what it numbers by position, each with the file and the quote that shows it; you write a report, and you write no verdicts file — nothing merges from it, so your findings ride in your report, and the main session takes them to the user.

**When:** The on-demand run on a row script, when the user asks for it.

Bad: A verdicts file written for a row-script run, so the merge grades findings that were never fill records.
Good: The same run with the report only — misses, misreads, and position-numbering, each with its file and quote — and no verdicts file.
