## Search the whole repo before claiming

**Law:** Search the entire repository — never just your own area — before claiming that something is duplicated, unused, or missing.

**When:** Verifying any sign 4, 5, 6, or 7 claim during a hunt; sign 6 lists what a plain symbol search misses (reflection, DI scans, serialisation, config binding, string names, and framework conventions).

Bad: Searching only `src/Cases/` and declaring `CaseSummaryDto` unused when `src/Reports/` imports it.
Good: Grepping the whole repository (and checking DI scans, templates, and config) before reporting `CaseSummaryDto` as dead code.
