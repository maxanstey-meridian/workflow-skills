## Report facts only without fixes or options

**Law:** Give each `findings[]` entry in `cold-read.yaml` only `section`, `quote` (the spec's quoted words), `detail` (what you found), and optional `file` and `symbol` — no fix, no recommendation, no option, and no question — and touch no file other than `cold-read.yaml`.

**When:** Writing `cold-read.yaml` and working during a cold read (the only command you may run is `spec-ctl.mjs validate cold-read`).

Bad: Writing a `detail` like `"P2 change is missing a retry count; I recommend 3 retries with exponential backoff"` or running `task test` to verify a claim.
Good: Writing `{ section: "pieces.P2.change", quote: "retry on failure", detail: "The spec gives no retry count. Notifier.SendAsync has no retry today.", file: "src/Notifier.cs", symbol: "Notifier.SendAsync" }` and running only `spec-ctl.mjs validate cold-read`.
