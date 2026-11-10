## Do not re-run Plumb on unchanged code

**Tooling:** Do not re-run Plumb in a loop on a repo you have not changed.

**When:** A repo that uses Plumb.

Bad: Plumb run three times in a row with no edit between the runs.
Good: Plumb run again only after the code has changed.
