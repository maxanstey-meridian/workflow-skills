## Judge from the tree, never the builder's report

**Law:** Use only the working tree, the spec, and your own command runs as evidence; never read the builder's report.

**When:** Checking any built piece of a spec against its Change, Proof, `owns`, and every Decision that bears on it.

Bad: Opening `build-P2-1.yaml` to see which files the builder changed or whether the tests passed.
Good: Running `git diff HEAD -- <owns>` and `git status --short -- <owns>`, reading the spec and files directly, and running the checks yourself.
