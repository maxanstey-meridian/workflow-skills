## Check leads against the code before reporting

**Law:** Treat every `knip`, `jscpd`, analyzer, and `report-design.md` entry as a lead to read — never a finding until checked against the code — and when a design lead covers code in your hunter area, add what you see to that lead (`confirmed`, `priced`, or `contradicted`, citing `file:line`) rather than reporting the same thing again.

**When:** Working through mechanical finder outputs (`leads-*.txt`) and `report-design.md` in a hunter pass.

Bad: Copying a `knip` unused-file line straight into findings without checking Nuxt auto-imports, or duplicating `D1` as `#1`.
Good: Reading the file first, dropping false leads under `Leads dropped`, and recording `D1 · priced · src/Cases/Jobs/RetryScheduler.cs:12-140 · ...` under `Notes on design findings:`.
