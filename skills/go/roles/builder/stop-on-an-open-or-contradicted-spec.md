## Stop on an open or contradicted spec

**Law:** Stop and report `result: STOPPED` with `stopReason` whenever the spec leaves the piece open (an unanswered ask, a "TBD", an "or" that leaves what gets built undecided, or an attempt-2 critic finding that the spec's own Proof cannot fail and no edit to owned files can cure) or the code contradicts the piece; never answer the question yourself, and reserve `result: STOPPED` strictly for an open or contradicted spec.

**When:** Before editing (build nothing and state what is open in `stopReason`, quoting the critic finding on attempt 2) and partway through building if the code contradicts the piece (leave your edits and state the contradiction in `stopReason`); a Proof that exits non-zero after you built the Change is `result: BUILT`, with its exit code in `ran`.

Bad: Picking one branch of "exponential or fixed backoff" in the spec and reporting `result: BUILT`, or reporting `result: STOPPED` because the piece's Proof exited 1 after building.
Good: Building nothing, naming the undecided backoff choice in `stopReason`, and setting `result: STOPPED`; or setting `result: BUILT` with the failing Proof's exit code in `ran` when the spec was clear.
