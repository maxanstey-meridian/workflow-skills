## Verify proof and keep disagreed judgements with a counter-case

**Law:** Check every finding's proof against the code by its sign's standard: drop a `proven` finding without its proof, and drop a `judgement` finding only for a wrong fact its argument rests on — never for disagreeing with the judgement (keep it and add `Against: <the counter-case>` on the next line).

**When:** Verifying `#N` and `D<n>` findings in a hunter or design-reader report; for `judgement` findings, verify the counts, what the code does, what the replacement does at the repo's versions, who asked for it, and that the argument follows from those facts.

Bad: Dropping a judgement finding on a 410-line retry host because you personally prefer keeping restart survival.
Good: Keeping the finding after confirming the 410-line count and hosting config, and adding `Against: Polly retries are in-process only; the app restarts about weekly, so a send in flight at a deploy is lost.`
