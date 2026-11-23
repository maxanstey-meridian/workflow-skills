## Treat a recorded decision as evidence, not a verdict

**Default:** When a spec Decision, the repo's instructions, a doc, or a commit chose the shape you are weighing, cite it; if the cost case still holds, report the finding as `judgement` and name which decision it reopens so the user decides.

**When:** Weighing code or capabilities backed by prior docs, ADRs, or spec Decisions; "the repo chose this" never ends the argument by itself.

Bad: Dropping a 500-line custom abstraction solely because a year-old doc says "we chose to wrap the SDK".
Good: Citing that doc in `Proof:`, reporting the finding as `judgement`, and stating which decision it reopens.
