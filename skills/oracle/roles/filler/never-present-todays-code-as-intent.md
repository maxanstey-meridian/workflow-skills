## Never present today's code as intent

**Law:** Set `source: today` whenever an expectation comes only from reading current code, existing test files, or an ephemeral/gitignored file (such as `.plans/*`) with no durable written spec, contract, doc, or Meridian rule behind it, and mark real defects `shortfall` against the intended behaviour (`tests/assert-the-intended-behaviour-not-todays-gap.md`) rather than weakening `expect` to match today's bug. `source: written` requires an existing, non-ignored, non-test repo-relative file path (optional `#anchor` or `:line`) or URL in `sourceRef` — no spaces, parentheses, or prose.

**When:** Drafting `expect`, `source`, `sourceRef`, and `status` for any row in `<slice>.oracle.yaml`.

Bad: Copying today's handler behaviour with `source: written`, citing a test file (`*.test.*`, `*.spec.*`, `*Tests.cs`, `test/*`) or a gitignored `.plans/*.yaml` file, stuffing prose/parentheses into `sourceRef`, or rewriting `expect` to match a known rounding bug so the row looks `active`.
Good: Setting `source: today` when only current code, existing tests, or a gitignored plan back the expectation so the user eyeballs it before locking, citing a bare committed doc path like `docs/rulings.md#ruling-21` for `source: written`, and marking the rounding bug `status: shortfall` with the intended `expect`.
