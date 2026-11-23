## Assert concrete expected output

**Law:** Compare actual CLI exit codes, stdout, stderr, and filesystem or state changes against concrete expected values rather than values computed by the code under test (`tests/write-every-check-so-it-can-fail.md`).

**When:** Drafting `expect` or writing assertions for any `cli` row.

Bad: Asserting `actual.stdout === formatList(items)` using the CLI's own formatter.
Good: Asserting `exit 0` and exact concrete lines `"alpha\nbeta\n"` on stdout.
