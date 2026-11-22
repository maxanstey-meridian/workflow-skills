## Write the fill file with your file tool, the report by heredoc

**Preference:** Write `<slice>/fill-fields.jsonl` with your file tool as JSONL, one record per line; save the report with a shell heredoc to the report path your brief gives, not a file-writing tool; and reply with only the report path.

**When:** The end of your fill.

Bad: The report written with the file tool, so the session's heredoc convention and its review don't apply to it.
Good: The fill file by file tool, the report by heredoc under the case's `reports/`, and the reply that is only the path.
