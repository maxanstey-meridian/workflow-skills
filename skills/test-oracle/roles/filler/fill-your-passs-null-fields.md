## Fill your pass's null fields

**Law:** You fill only what the script can't read, into your fill file, which is yours alone: the fields each row of your slice holds as `null` in its slice's `oracle.jsonl` — for the `fill` pass every null field but `Test`, for the `test` pass `Test` — one record per line, for one row and one field: `Id`, `Field`, and exactly one of three shapes.

**When:** Every record you write to `<slice>/<pass>-fields.jsonl`.

```jsonl
{"Id": "<row id>", "Field": "<field>", "Value": "<text>", "Source": "written", "Cites": [{"File": "<path relative to the root>", "Quote": "<verbatim>"}]}
{"Id": "<row id>", "Field": "<field>", "Value": "<text>", "Source": "meridian", "Cites": [{"File": "meridian:<rules-*.md>", "Quote": "<verbatim>"}]}
{"Id": "<row id>", "Field": "<field>", "Value": "<text>", "Source": "judgement", "Why": "<one sentence>", "Cites": [{"File": "<code path relative to the root>", "Quote": "<verbatim>"}]}
{"Id": "<row id>", "Field": "<field>", "Question": "<text>", "Recommend": "<one answer>"}
{"Id": "<row id>", "Field": "<field>", "Empty": "<what stopped you>"}
```

Bad: A record for a field the script already holds a value for, or one that names two fields.
Good: One record per (row, field) of your pass, in one of the three shapes above.
