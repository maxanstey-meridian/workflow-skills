## Classify each finding as fix, park, ask, or nit

**Law:** Set `do` to `fix` only when this work caused the harm, the spec promised it, or the fix is mechanical and a few lines with no design call and none of the `ask` cases holds; use `park` for real, non-trivial issues older than this work; use `ask` for choices between working options, user-only questions, harms coming from a spec Decision itself rather than how it was built, fixes adding a mechanism neither the spec nor the code already has (a new type, mode, snapshot, cache, or second code path), or fixes changing what a Decision, Proof, or spec-quoted text says (listing options on `fix` with the option that promises less first — the behaviour dropped or narrowed so the harm cannot happen and what users lose by it — and naming the Decision and any Law it breaks); and use `nit` for style only while leaving harmless code unflagged.

**When:** Assigning the `do:` line of every finding block in a slice review or doctrine review.

Bad: Marking a finding `do: fix` when fixing it requires introducing a new snapshot cache or changing a spec Decision, or flagging harmless code as a `nit`.
Good: Marking a spec-Decision harm `do: ask` with the narrower option first and naming the Decision and broken Law, and marking a bug introduced by this diff `do: fix`.
