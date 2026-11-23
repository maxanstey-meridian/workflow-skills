## Name what still protects the behaviour

**Law:** For every finding that removes or weakens a protection (a test, guard, validator, constraint, or type), name by `file:line` what still protects that behaviour afterwards — never citing something else you are flagging — or drop the finding if nothing protects a behaviour meant to stay; a design finding dropping a behaviour on purpose names the tests that change with it, and dependent findings (B dead only once A goes) are reported as one finding.

**When:** Writing `Protected by:` on any finding in a hunter or design-reader report.

Bad: Flagging an inner guard while also flagging the outer guard you named on `Protected by:`, or reporting two coupled removals as separate findings.
Good: Citing the unflagged boundary validator at `CreateCaseValidator.cs:14` on `Protected by:`, and combining coupled removals into one finding.
