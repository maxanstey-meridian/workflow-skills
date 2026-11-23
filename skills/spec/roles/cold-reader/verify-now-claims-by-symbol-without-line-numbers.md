## Verify Now claims by symbol without line numbers

**Law:** Confirm that every symbol and quoted fragment leads to the code the spec means, that the code does everything `Now` says (skipping pieces whose id is on `**Built pieces:**`), and that no line number points at code.

**When:** Checking each unbuilt piece's `Now` line and code references across the spec.

Bad: Trusting `Now: "Notifier.SendAsync retries three times"` without opening `src/Notifier.cs`, or letting `src/Notifier.cs:42` pass.
Good: Reading `src/Notifier.cs`, reporting that `Notifier.SendAsync` has no retry today, and flagging any line-number pointer.
