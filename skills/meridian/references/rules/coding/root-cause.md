## Root Cause

Fix root causes before adding shims.

Prefer fixing:

- the real boundary
- the real model
- the real config
- the real dependency direction

**Law:** a gap with a doc page is still a gap. Writing a problem down does not
resolve it. A decision record, an `INVARIANTS.md` `Accepts`, a changelog "known
issue", a README caveat or a code comment never stands in for a fix.

- A **gap** is something wrong, unenforced or unchecked that could be fixed: a
  promise nothing verifies, an entry point outside a guard, a false positive, a
  rule that holds only "because no caller does X today".
- A **trade-off** is a cost chosen over a working alternative, for a stated
  reason, such as one more indexed query per cache miss rather than building
  stampede protection. Only trade-offs go under `Accepts`.
- The test: would we welcome a change that removed it at no other cost? If yes,
  it is a gap.
- A doc may say a gap exists only while a tracked fix for it is open, and names
  that fix.
- What to do with one: fix it now when this work caused or promised it, or the fix is trivial; otherwise report it as new work, never as a decision or a note.
