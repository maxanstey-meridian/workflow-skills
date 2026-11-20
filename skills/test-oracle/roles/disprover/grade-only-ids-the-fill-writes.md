## Grade only ids the fill writes

**Law:** Every record's `Id` is a record of the slice, taken from `<slice>/<pass>-fields.jsonl`: a verdict for an id the slice does not fill exits 2 and merges nothing — grade the ids the filler wrote, and put what it missed in prose.

**When:** Every record of your verdicts file.

Bad: A verdict record on a row the fill never wrote, so the merge refuses the whole slice.
Good: The same row's miss in the report's Missed list, and the verdicts file holding only the fill's ids.
