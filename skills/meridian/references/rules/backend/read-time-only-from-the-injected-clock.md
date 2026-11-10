## Read time only from the injected clock

**Default:** All production code, adapters and SQL included, reads the time from one injected clock, so a test that fixes the clock fixes every comparison.

**When:** .NET (`TimeProvider`) and TypeScript (a `Clock` port). No `DateTime.UtcNow`, no `Date.now()`, and no `now()` in queries.

Bad: `WHERE expires_at < now()`.
Good: `WHERE expires_at < @now`, with `@now` from the injected clock.
