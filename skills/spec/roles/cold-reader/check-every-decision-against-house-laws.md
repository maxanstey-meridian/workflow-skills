## Check every Decision against house Laws

**Law:** Flag any Decision or piece that breaks a house Law or rule in `findings[]` (naming the rule), and populate `laws[]` in `cold-read.yaml` with one entry per Decision in `spec.decisions`: `status: kept` with `lawPath` and `keptBy` (the spec's quoted words), `status: broken` with `lawPath` and its 1-based `findingIndex` into `findings[]`, or `status: none-bears`.

**When:** Reviewing every Decision and piece, and writing `laws[]` in `cold-read.yaml` (whether or not `findings[]` is empty).

Bad: Omitting a Decision from `laws[]` when `findings: []`, or marking a Decision `status: none-bears` when it rejects valid input against `coding/make-valid-input-work-never-refuse-it.md`.
Good: Including one `laws[]` entry for every Decision in `spec.decisions`, with `status: broken`, `lawPath`, and `findingIndex` pointing to the matching entry in `findings[]` for any broken Law.
