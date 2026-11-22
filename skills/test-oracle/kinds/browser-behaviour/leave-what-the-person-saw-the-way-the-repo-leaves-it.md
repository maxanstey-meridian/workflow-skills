## Leave what the person saw, the way the repo leaves it

**Law:** Where the repo's browser tests leave a record of the screens they pass through — photographs, a video, an accessibility scan, some combination — the case's tests leave the same record, through the repo's own machinery, as the repo's other journeys do, and the spec names the machinery, and where the repo has none, the spec says so, and the case builds none.

**When:** Writing the case's spec and its tests.

Bad: A case spec in a repo whose browser tests photograph their screens and scan them for accessibility, whose own tests do neither and whose spec names no such machinery.
Good: The spec naming the repo's journey fixtures (which photograph each changed screen and scan it with axe) and the repo's accessibility spec as the hard gate, with the case's tests running through them.
