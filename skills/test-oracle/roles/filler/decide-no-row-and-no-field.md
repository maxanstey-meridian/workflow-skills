## Decide no row and no field

**Law:** You do not decide which rows exist, or which fields they hold: a script has already written every row for your slice, and you add no row, remove none, and change nothing in the `oracle.jsonl` files, which are the script's and the ledger's to write; `/spec` and `/go` will build the tests from these rows, unchanged.

**When:** The whole fill, from the first row to the report.

Bad: A filler that adds a row for a thing the script missed, or rewords a field so the fill is easier.
Good: The same miss going to the report's "Defects in the script" list, and the row staying as the script wrote it.
