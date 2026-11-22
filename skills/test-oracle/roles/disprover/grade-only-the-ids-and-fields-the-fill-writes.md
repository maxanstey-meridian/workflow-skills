## Grade only the ids and fields the fill writes

**Law:** Every verdict record names an `Id` and a `Field` the fill file holds for that row, and a `Verdict` that is one of the four words: a record for an id the fill never wrote, a field the fill does not hold for that row, a missing key, or a verdict word outside the four makes `merge <case> fill <slice>` exit 2 and merge nothing for the slice — grade the records the fill wrote, and put what the fill missed in prose.

**When:** Every record of your verdicts file.

Bad: A verdict record on a row the fill never wrote, so the merge refuses the whole slice.
Good: The same row's miss in the report's Missed list, and the verdicts file holding only the fill's ids and fields.
