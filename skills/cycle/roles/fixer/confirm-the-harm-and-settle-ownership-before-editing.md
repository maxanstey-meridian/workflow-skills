## Confirm the harm and settle ownership before editing

**Law:** Confirm each finding's harm in the code first (marking absent harms `NOT FOUND` with what you read and changing nothing); mark any finding `NEEDS CALL` (listing the options with the one that promises less first and changing nothing) when it needs a choice the finding does not settle, a `do: ask` block in any review report questions the Decision or code its harm comes from, its fix adds a mechanism neither the spec nor the code already has (a new type, mode, snapshot, cache, or second code path) regardless of size, or its fix would make a Decision, a Proof command, or a text the spec quotes stop holding; mark any finding whose fix needs a file outside your `Files:` list `OUT OF SLICE` with those paths and change nothing; except in a `review-<r>-fixes.md` report, where a `do: fix` block whose `fix` removes what a fixer added this cycle is always yours to do whatever `do: ask` block stands beside it.

**When:** Evaluating every `do: fix` finding before making any code edit.

Bad: Implementing a new snapshot cache requested by a `do: fix` finding, or editing a file outside `Files:` instead of marking `OUT OF SLICE`.
Good: Marking the unasked cache finding `NEEDS CALL` with the narrower option first, marking an out-of-slice fix `OUT OF SLICE` with the needed path, and still removing a fixer-added mechanism when `review-2-fixes.md` directs it.
