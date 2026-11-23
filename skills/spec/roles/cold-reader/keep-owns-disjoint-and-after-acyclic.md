## Keep owns disjoint and after acyclic

**Law:** Flag any file listed in two pieces' `owns`, any `after:` naming a piece id that does not exist, and any cycle in `after:`.

**When:** Checking the `owns:` and `after:` headers of every piece in the spec.

Bad: Letting P1 and P3 both list `src/Mailer.cs` in `owns`, or overlooking `P2 after: P3` paired with `P3 after: P2`.
Good: Reporting the overlapping `owns` path and every missing or cyclic `after:` reference.
