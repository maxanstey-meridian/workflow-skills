## Check every owned Piece against the spec

**Law:** With a spec, check every Piece whose `owns:` paths appear in your slice to verify that every requirement in its Change and Proof is built, every relevant Decision is honoured, nothing from Out of scope is built, and no change in those paths is unaccounted for by the spec; report any promised requirement missing from the code as a finding, judge any path no Piece owns on its own merits, and never treat honouring a Decision as waiving a house Law — when a Decision itself breaks a Law (including when excused in the Decision's `why` by a fixable test helper, convenience, or "today's code" limitation), file it as `do: ask` naming the Decision and broken Law.

**When:** Reviewing a slice when `Spec:` is not `none` in mode `diff` or `full`.

Bad: Passing a slice because the code compiles and matches Decision D2 when Piece P2's Change also promised a missing deletion, includes an Out-of-scope refactor, or D2 breaks a house Law under a `why` excuse that a test helper makes the library awkward.
Good: Filing a finding for the missing deletion and a finding for the Out-of-scope edit, filing `do: ask` naming Decision D2 and the broken house Law despite its `why` excuse, and judging an unowned helper file on its own merits.
