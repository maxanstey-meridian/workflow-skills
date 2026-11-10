## Leave harmless redundancy out of review findings

**Default:** Do not report redundancy that helps a reader, a threshold value tuned empirically, or an assertion that could theoretically be tighter but already covers the behaviour.

**When:** Writing review findings on any stack.

Bad: A finding "this null check is redundant" on a guard that makes the next line readable.
Good: No finding.
