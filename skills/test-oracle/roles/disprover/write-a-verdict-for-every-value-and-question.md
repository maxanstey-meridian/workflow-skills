## Write a verdict for every value and question

**Law:** Your prose report is evidence; your verdicts file is the gate: after the report, write your verdicts file, `<slice>/<pass>-verdicts.jsonl` in the case folder, for a fill report — one JSONL record for every value and question record of the fill, `Field` naming the field the claim rides on, and `Id` naming the row it rides on; an `Empty` record needs none; copy the record you judged into `Judged`, as it stands in the fill, without its `Id` and `Field`.

**When:** After your report, for a fill report.

```jsonl
{"Id": "<row id>", "Field": "<field>", "Verdict": "CONFIRMED | PARTLY | WRONG | CAN'T TELL", "Evidence": "<one line: the grep you ran, the quote that holds, or what broke>", "Judged": <the fill record you judged, without "Id" and "Field">}
```

Bad: A verdicts file that is short one record, on the question the report argued longest over.
Good: A record for every value and question record of the fill, `Judged` copied exactly, and the `Empty` records the only ones without.
