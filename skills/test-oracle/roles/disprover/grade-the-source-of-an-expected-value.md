## Grade the Source of an expected value

**Law:** Grade every expected value by its `Source` — a value of an expected field with no `Source`, or a word outside `written`, `ruling`, `meridian`, `today`, `judgement`, is WRONG, and so is a value with a source above `today` that cites only the code under test — and open the source of every record the fill wrote, expected or not, asking whether that source says that, for that row.

**When:** Every record of the fill report, for every field it filled.

- `written`: grep the quote in the file it cites, and ask whether that is what it says, not the filler's paraphrase of it. The file must be a doc, spec, or contract, never the code the row's `Where` points into, the row script, or a file under the case folder.
- `ruling`: grep the quote in the rulings file it cites, the top-level `rulings.md` or the slice's.
- `meridian`: grep the quote in the `rules-*.md` file the `meridian:` cite names, the quote verbatim in it, not the filler's reading; then read the code and check it really breaks, or is held to, that rule for that row. A rule that doesn't apply to that row is WRONG.
- `judgement`: agree only if its `Why` holds plainly, to any reader and without the code's help. If it takes an argument, it is not plain: PARTLY or WRONG.
- `today`: try to disprove it. Look for a Meridian rule, a written source, a ruling, or an obvious wrong that overrides the code's say for that row. If you find one, the value is WRONG, and you quote it. Only a `today` value with nothing above it is CONFIRMED; one cited to anything but the code is WRONG.
- Every record, expected or not: a field that says more, or less, than its source does is WRONG, and a `CantHappen` record must cite every link of its chain.

Bad: A CONFIRMED on a `written` value whose cited file is the code the row's `Where` points into.
Good: The same value refused — WRONG, the code is never its own written source — and the filler sent back for the spec that says it.
