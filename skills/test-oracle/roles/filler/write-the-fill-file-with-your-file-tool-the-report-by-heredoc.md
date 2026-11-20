## Write the fill file with your file tool, the report by heredoc

**Preference:** Write the records with your file tool as JSONL, one record per line; save the report with a shell heredoc to `<absolute report path>`, under the case's `reports/`, not a file-writing tool; and reply with only the report path.

**When:** The end of your pass.

Bad: The report written with the file tool, so the session's heredoc convention and its review don't apply to it.
Good: The fill file by file tool, the report by heredoc under the case's `reports/`, and the reply that is only the path.
