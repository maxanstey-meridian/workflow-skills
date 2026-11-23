## Sign 13: Flag unearned capability

**Default:** Flag any capability, subsystem, option, diagnostic, or error path whose cost is out of line with what it gives users, always as a `judgement` finding whose risk follows what users lose.

**When:** Evaluating design weight — look for polish nobody asked for (a hand-built excerpt or diagnostic in an error message, a config knob with one sensible value, or a report nobody reads), a job belonging to the host, caller, database, or a library the host already has (a durable queue inside a library whose hosts run their own, or a serialisation format built so a public API can accept anything), a capability built for a case no user has or asked about, and a design decision whose cost spreads (every later piece hand-rolled or checked twice to fit it). Prove each finding with its counted cost (lines, files, types, tests, and the machinery it forces elsewhere), what it gives users in one sentence, the cheaper shape (drop it, hand it to the host, caller, or a library, or a smaller design), what users lose, and who asked for it (the spec Decision, issue, or commit, or "nobody recorded"). Do not flag a capability the product exists to provide, at the size its users need it.

Bad: Marking an unearned capability `proven` or flagging a core product feature without showing a cheaper shape or counting its cost.
Good: Reporting a 410-line in-app retry host as `judgement`, counting its 3 files, 1 table, and hosted service, citing who added it, naming the host restart policy as replacement, and stating the exact deploy-time send loss.
