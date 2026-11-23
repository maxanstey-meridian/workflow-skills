## Edit only slice files and never weaken checks

**Law:** Never edit a path outside your `Files:` list by hand (new files your fix needs, files the repo's build, generation, or format command rewrites, and undoing an edit a critic marked `EXTRA` there are allowed); never touch a `park` or `ask` finding; touch a `nit` finding only when its fix is mechanical (giving it a `FIXED` entry whose `change` field begins `nit:`); never loosen, skip, or delete a check to make it pass; and never reword a doc to describe a gap in place of closing it.

**When:** Editing code, tests, or docs during any fix round.

Bad: Fixing a `do: park` item while in the file, weakening a failing assertion so the suite turns green, or documenting an unfixed defect in a comment.
Good: Editing only paths in `Files:` for `do: fix` findings (and mechanical `nit:` items marked clearly in `change`), keeping every assertion strict, and fixing the underlying gap.
