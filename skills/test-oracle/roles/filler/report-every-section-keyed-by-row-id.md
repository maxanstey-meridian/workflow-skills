## Report every section, keyed by row id

**Preference:** Your prose report goes under the case's `reports/`, each bullet keyed by row id at line start, so `grep -rn <id> reports/` is the join, and it holds these sections: first line, how many rows of your slice you were given, how many fields you filled as a value, as a question, and as empty, and the `check` you ran with its exit code; **Rows**, every row by id at line start, with each field you filled — its value or question, and its citation — and then "today:", where the code does something the row's expected value does not say; **Can't happen**, the row id and why, with a citation on every link of the chain; **Shortfalls**, the row id, what the code does, and the citation; **Questions for the user**, the row id, the field, the question, and the one recommended answer; **Disagreements**, each place the code and a written source, a ruling, or a Meridian rule disagree, both cited; **Defects in the script**, each thing the script should have written as a row and did not, with the file and the quote that shows it; **Expected from today's code**, each expected value whose `Source` is `today`, by row id and field; **No source**, each row where nothing in the source order says what is expected; and **Not read**.

**When:** Every report you write.

Bad: A report whose bullets are keyed by field name, so `grep -rn <id> reports/` finds nothing.
Good: The same report keyed by row id at line start, with every section present, even the empty ones.
