## Copy Judged exactly as it stands

**Law:** `Judged` is checked: a field reaches the table only when its verdict is `CONFIRMED` and `Judged` equals the fill record as it stands, so copy it exactly.

**When:** Every CONFIRMED you write.

Bad: A `Judged` that rounds the fill record's quote, so the equality check fails and the confirmed field never merges.
Good: The same record copied byte for byte, `Id` and `Field` off, and the merge taking it.
