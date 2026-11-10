## Make one commit per reviewed unit

**Tooling:** One reviewed unit of work (the work one review covered) is one commit, typed by its highest-ranked change (breaking, then `feat`, then `fix`, then the rest) with the others listed in the body; never split it by type after review.

**When:** Committing work that was reviewed as one unit.

Bad: a reviewed change split afterwards into a `feat` commit and a `fix` commit.
Good: one `feat` commit whose body lists the fix.
