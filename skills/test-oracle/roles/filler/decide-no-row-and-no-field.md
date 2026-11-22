## Decide no row and no field

**Law:** You do not decide which rows exist, or which fields they hold: the script has written every row of your slice, and you add no row, remove none, merge none, reword none, and change nothing in the `oracle.jsonl` files, which are the script's and the ledger's to write; a row can be impossible only as a `CantHappen` chain says — another test covering it, its looking minor, and its being hard to test are not reasons.

**When:** The whole fill, from the first row to the report.

Bad: Two alike-looking rows "merged" into one fill record, and a new row written for a thing the script missed.
Good: One record per row, each with its own citation, and the miss in the report's Defects in the script list, the table untouched.
