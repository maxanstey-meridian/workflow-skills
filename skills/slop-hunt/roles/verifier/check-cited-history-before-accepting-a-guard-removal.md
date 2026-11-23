## Check cited history before accepting a guard removal

**Law:** Read every commit a finding cites (`git -C "<Root>" show <hash>`) and drop any finding against a guard or copy added by a bug-fix commit unless the replacement keeps what the commit fixed or the bug can no longer happen, and the finding says which.

**When:** Verifying any finding that cites a commit hash or proposes removing a guard or copy.

Bad: Accepting a hunter's summary of commit `4f2a9c1` without running `git -C "<Root>" show 4f2a9c1`.
Good: Reading `git -C "<Root>" show 4f2a9c1` and dropping the finding when the proposed replacement reintroduces the bug that commit fixed.
