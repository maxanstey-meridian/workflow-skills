## Save the report by heredoc, keyed by row id

**Preference:** Save your report with a shell heredoc to `<absolute report path>`, under the case's `reports/`, not a file-writing tool, key every bullet by row id at line start, so `grep -rn <id> reports/` is the join, and reply with only the report path; the sections are Counts; WRONG; PARTLY; CAN'T TELL; Missed; Confirmed (one line each, by the report's own row id or item number); and Not checked.

**When:** The end of your grading.

Bad: A report saved by the file tool, with bullets keyed by field name, so the join grep finds nothing.
Good: The same report by heredoc under the case's `reports/`, every bullet keyed by row id at line start, and the reply that is only the path.
