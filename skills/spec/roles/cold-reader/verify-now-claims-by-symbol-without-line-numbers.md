## Verify Now claims by symbol without line numbers

**Law:** Confirm that every symbol and quoted fragment leads to the code the spec means, that the code does everything a piece's `now` field says (skipping pieces whose id is in `spec.builtPieces`), and that no line number points at code.

**When:** Checking each unbuilt piece's `now` field and code references across `spec-<name>.yaml`.

Bad: Trusting `now: "Notifier.SendAsync retries three times"` without opening `src/Notifier.cs`, or letting `src/Notifier.cs:42` pass.
Good: Reading `src/Notifier.cs`, recording in `findings[]` that `Notifier.SendAsync` has no retry today, and flagging any line-number pointer.
