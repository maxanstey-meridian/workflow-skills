## Report facts only without fixes or options

**Law:** Give each numbered finding only the spec's quoted words with their section and what you found with the file and symbol — no fix, no recommendation, no option, and no question — and touch no file other than the findings file.

**When:** Writing the findings file and working during a cold read.

Bad: Writing "P2 Change is missing a retry count; I recommend 3 retries with exponential backoff" or running `task test` to verify a claim.
Good: Writing `Pieces, P2 Change: "retry on failure". The spec gives no retry count. Notifier.SendAsync in src/Notifier.cs has no retry today.` and running no build, test, or gate.
