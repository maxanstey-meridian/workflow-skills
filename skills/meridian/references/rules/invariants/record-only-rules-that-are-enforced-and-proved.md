## Record only rules that are enforced and proved

**Default:** Add an `invariants.yaml` entry only when the rule is both enforced and proved, with non-empty `owner` and `proof` lists of bare symbol or path strings, and never loosen the schema for unproved rules.

**When:** Deciding whether a rule belongs in `invariants.yaml`. `owner` lists only authoritative enforcing boundaries (`Type`, `Type.Member`, SQL trigger/index/constraint name, analyzer ID, or config path — using the EF configuration type for unnamed indexes, the options type for config keys, and the contract, controller, or use case for HTTP routes, omitting downstream UI and read-model helpers). `proof` lists the narrowest failing test or build check (`TestClass.TestMethod`, `TestClass`, `File.feature`, `*.spec.ts`, `*.nuxt.spec.ts`, or build/analyzer config path).

Bad: Adding an entry for "a published form never changes" with no guard or test, or leaving `proof: []` until tests exist.
Good: Writing the guard and failing test first, then adding the entry with bare `owner` and `proof` symbols.
