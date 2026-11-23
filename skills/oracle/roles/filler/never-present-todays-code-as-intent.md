## Never present today's code as intent

**Law:** Set `source: today` whenever an expectation comes only from reading current code with no written spec, contract, doc, or Meridian rule behind it, and mark real defects `shortfall` against the intended behaviour (`tests/assert-the-intended-behaviour-not-todays-gap.md`) rather than weakening `expect` to match today's bug.

**When:** Drafting `expect`, `source`, and `status` for any row in `<slice>.oracle.yaml`.

Bad: Copying today's handler behaviour with `source: written`, or rewriting `expect` to match a known rounding bug so the row looks `active`.
Good: Setting `source: today` when only current code backs the expectation so the user eyeballs it before locking, and marking the rounding bug `status: shortfall` with the intended `expect`.
