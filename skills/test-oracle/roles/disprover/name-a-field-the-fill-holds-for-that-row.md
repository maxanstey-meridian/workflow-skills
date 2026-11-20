## Name a field the fill holds for that row

**Law:** Every record names a field the fill holds for that row: a record for a field the fill does not hold, a missing key, or a verdict that is not one of the four words makes the merge exit 2 and merge nothing for the slice.

**When:** Every record of your verdicts file.

Bad: A verdict on a field the fill left out, so the slice's merge dies on it.
Good: The same field left to the fill — named in prose as a miss — and the verdicts file holding only fields the fill holds.
