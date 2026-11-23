## Validate the case before reporting

**Law:** Run `<ledger> validate <case>` and fix every schema or status error in `<slice>.oracle.yaml` until `validate` exits `0` before writing the report.

**When:** Finishing edits to `<slice>.oracle.yaml` in any `filler` pass.

Bad: Writing the report without running `validate`, or leaving a `shortfall` row with a non-null `question`.
Good: Running `node <skill>/scripts/ledger.mjs validate <case>`, fixing any reported schema or status error, and confirming exit `0` before writing the report.
