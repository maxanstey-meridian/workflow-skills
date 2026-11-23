## Check every owned Piece against the spec

**Law:** With a spec, check every Piece whose `owns:` paths appear in your slice to verify that every requirement in its Change and Proof is built, every relevant Decision is honoured, nothing from Out of scope is built, and no change in those paths is unaccounted for by the spec; report any promised requirement missing from the code as a finding, and judge any path no Piece owns on its own merits.

**When:** Reviewing a slice when `Spec:` is not `none` in mode `diff` or `full`.

Bad: Passing a slice because the code compiles when Piece P2's Change also promised a deletion that is missing and includes an Out-of-scope refactor.
Good: Filing a finding for the missing deletion and a finding for the Out-of-scope edit, while judging an unowned helper file on its own merits.
