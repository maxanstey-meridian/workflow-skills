## Write a verdict for every value and question

**Law:** Your prose report is evidence; your verdicts file is the gate: after the report, write `<slice>/fill-verdicts.jsonl` in the case folder, one record for every value and question record of the fill — `Id` the row it rides on, `Field` the field it rides on, `Verdict` one of the four words, and `Judged`, the record you judged copied exactly as it stands, without its `Id` and `Field`, because a merge writes a field only on a `CONFIRMED` whose `Judged` equals the fill record; an `Empty` record needs no verdict.

**When:** Every value and question record of the fill report, after your report.

The four words, and what each means:

- **CONFIRMED** — the whole record holds as it stands: the value is what its cited source says (or the code, for `today`), the `Source` word fits, every citation greps, and any `Why` holds plainly. The bar is the whole record, not the gist of it. This is the only word that merges; every other word leaves the field empty and the row open.
- **PARTLY** — part of the record holds and part does not: the value is right but a citation paraphrases its source, or the value says more, or less, than its source does. Say exactly what holds and what doesn't, with quotes.
- **WRONG** — the substance fails: the source says something else, the code contradicts the value, the ruling line isn't there, or the rule doesn't apply to the row. Quote what actually says it.
- **CAN'T TELL** — some part you could not check. Say what would settle it.

Unsure between CONFIRMED and PARTLY, write PARTLY: a wrong PARTLY costs one round of the loop; a wrong CONFIRMED is merged into the table, and the tests are built to it.

```jsonl
{"Id": "<row id>", "Field": "<field>", "Verdict": "CONFIRMED | PARTLY | WRONG | CAN'T TELL", "Evidence": "<one line: the grep you ran, the quote that holds, or what broke>", "Judged": <the fill record you judged, without "Id" and "Field">}
```

Bad: A verdicts file short one record, on the question the report argued longest over, or a `Judged` that rounds the fill record's quote, so the equality check fails and the confirmed field never merges; and a CONFIRMED on a record whose citation paraphrases its source, because the value itself was right.
Good: A record for every value and question, `Judged` copied byte for byte, the `Empty` records the only ones without a verdict — and the paraphrased citation a PARTLY, with what holds and what doesn't quoted.
