## Grade the Source of an expected value

**Law:** Grade every expected value's `Source`: a value of an expected field with no `Source`, or a word outside `written`, `ruling`, `meridian`, `today`, `judgement`, is WRONG, and then the check is by the source, and a value with a source above `today` that cites only the code under test is WRONG.

**When:** Every value record of an expected field.

- `written`: grep the quote in the file it cites. The file must be a doc, spec, or contract, never the code the row's `Where` points into, the row script, or a file under the case folder. Is that what it says, for that row?
- `ruling`: grep the quote in the rulings file it cites, the top-level `rulings.md` or the slice's.
- `meridian`: grep the quote in the `rules-*.md` file the `meridian:` cite names. Then read the code and check it really breaks, or is held to, that rule for that row. A rule that doesn't apply to that row is WRONG.
- `judgement`: agree only if its `Why` holds plainly, to any reader and without the code's help. If it takes an argument, it is not plain: PARTLY or WRONG.
- `today`: try to disprove it. Look for a Meridian rule in the `rules-*.md` files, a written source, a ruling, or an obvious wrong that overrides the code's say for that row. If you find one, the value is WRONG, and you quote it. Only a `today` value with nothing above it is CONFIRMED. A `today` value cited to anything but the code is WRONG.

Bad: A CONFIRMED on a `written` value whose cited file is the code the row's `Where` points into.
Good: The same value refused — WRONG, the code is never its own written source — and the filler sent back for the spec that says it.
