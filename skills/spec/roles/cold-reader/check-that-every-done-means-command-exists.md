## Check that every Done-means command exists

**Law:** Confirm that every `Done means` command exists in the repo as written — its script, target, or test project is present on disk.

**When:** Checking the `Done means` section of the spec.

Bad: Accepting `make verify` without checking whether `Makefile` defines a `verify` target.
Good: Reading `Makefile` and reporting that no `verify` target exists.
