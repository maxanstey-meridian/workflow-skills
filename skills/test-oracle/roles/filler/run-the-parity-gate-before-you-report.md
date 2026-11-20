## Run the parity gate before you report

**Law:** Before you report, run the gate on your slice — `node <this skill's folder>/scripts/ledger.mjs check <the case folder> <pass> <slice>` — and fix your records until it exits 0.

**When:** The end of your pass, before the report.

The gate checks, on your fill file: the file exists; every record has an `Id` and a `Field` and exactly one shape; every `Id` is a row of the slice and every `Field` is a field your pass holds as null on that row; no (`Id`, `Field`) is there twice; every row of the slice that is not struck and has no confirmed `CantHappen` has a record for every field of your pass other than `CantHappen` and `Shortfall`, unless the table already holds a value for it, or a question that has no ruling yet; every value has a citation, its file is under the root and exists (a `meridian:` file is a `rules-*.md` file in this skill's `references/` folder), and its quote is 3 characters or more and is in the file; every value of an expected field has a `Source` that is one of the five words, and its citations fit it (`written`: a file that is not the row script, not the file the row's `Where` names, and not a file under the case folder; `ruling`: a rulings file, the top-level `rulings.md` or your slice's; `meridian`: a `meridian:<rules-*.md>` cite whose quote is in that file; `judgement`: a non-empty `Why`); `CantHappen` and `Shortfall` records are values; a `Test` value has a citation whose quote holds that row's id (compared lower-case, letters and digits only); a question has a `Question` and a `Recommend`; and an `Empty` says what stopped you.

Bad: A report sent with the gate at exit 1, and the fix "for next time".
Good: The gate at exit 0 before the report, with the records it refused fixed and re-run.
