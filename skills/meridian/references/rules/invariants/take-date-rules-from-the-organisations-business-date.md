## Take date rules from the organisation's business date

**Default:** A rule that depends on the date takes the business date, "today" in the organisation's time zone, from the one clock every caller uses, not a UTC date cut from the current instant.

**When:** Any date-based rule on the server.

Bad: `DateOnly.FromDateTime(DateTime.UtcNow)` in a "lapses today" rule.
Good: Today's date in the organisation's time zone, taken from the injected clock and passed in.
