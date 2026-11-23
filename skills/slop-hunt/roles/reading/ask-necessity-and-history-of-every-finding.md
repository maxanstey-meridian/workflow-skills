## Ask necessity and history of every finding

**Law:** For every finding, establish necessity (what user-visible behaviour breaks if it goes, or "nothing" — "a test fails" is not a behaviour, while error-message wording or a rare edge counts when stated plainly) and history via `git log -L <start>,<end>:<file> -s --format='%h %as %s'` and `git show <hash>`, citing the commit hash for any guard or copy and showing what replaces a bug-fix fence or why the bug can no longer happen.

**When:** Arguing any finding in a hunter or design-reader report.

Bad: Writing `Users lose: a unit test fails` and skipping `git log -L` on a null guard added by a bug-fix commit.
Good: Stating the exact user-visible effect (or "none"), citing `4f2a9c1`, and explaining why the replacement keeps what that commit fixed.
