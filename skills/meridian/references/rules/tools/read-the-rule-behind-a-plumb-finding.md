## Read the rule behind a Plumb finding

**Tooling:** Before fixing a Plumb finding, read the rule file its `docRef` names.

**When:** Fixing Plumb findings; a finding's `docRef` is `rules/<folder>/<file>.md` under the meridian skill's `references/`.

Bad: a finding "fixed" by guessing from its one-line message, without opening the rule file its `docRef` names.
Good: the cited rule file read, and the code changed to follow it.
