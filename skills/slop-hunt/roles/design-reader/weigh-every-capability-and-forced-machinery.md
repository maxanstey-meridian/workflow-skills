## Weigh every capability and forced machinery

**Law:** Weigh every mapped capability — above all any that forces machinery on others (a check that rules libraries out, or a format others must write to) — stating what it gives users, the cheapest shape (the platform, a library, the host's or caller's job, a smaller design, or nothing), what users would lose, and what the change would cost; report any capability that costs more than it gives or has a cheaper shape as a finding, and mark each earned one in the map with what earns it.

**When:** Evaluating capabilities in a design-reader pass.

Bad: Marking a 410-line custom retry host "earned" because it is clean, without comparing it against the host's restart policy or pricing what it forces on callers.
Good: Reporting the retry host as `D1` with its cost, cheaper shape, and user loss, and marking `Case search` earned with "the main screen users work from".
