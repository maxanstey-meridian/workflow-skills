## Edit only owned files and honour spec Decisions

**Law:** Edit by hand only the files on the piece's `owns:` (never a file outside `owns:` or another session's work), honour every Decision in the spec that bears on the piece, fix the root cause, reuse what the piece's Reuse line names, and sweep the files you own for the same problem.

**When:** Implementing a piece's Change; if a whole-tree format or lint command rewrites files outside `owns:`, that is fine — list each file it rewrote on `Changed:`.

Bad: Editing a helper outside `owns:` to make the piece easier, or fixing one call site while leaving a duplicate bug in another owned file.
Good: Editing only paths in `owns:`, applying every relevant Decision, reusing the named helper, and sweeping every owned file for the same defect.
