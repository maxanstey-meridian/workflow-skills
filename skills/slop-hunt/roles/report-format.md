# The hunters' report

This is the format of a hunter's and the design reader's report. The verifier and the reporter read it, and write their own in their role part.

The report holds a **weight map** (the role part of the hunter or the design reader says what comes before it): one line per piece of what the report covers (a capability, a subsystem, or a cluster of files that does one job):

`<what it's for> · <files or folders> · <lines> · <share of scope>% · <earned: what earns it, in a few words | see #N or D<n>>`

Lines come from `sizes.txt`. Share is those lines over every line in `sizes.txt`, which `awk -F'\t' '{s+=$1} END{print s}' "<hunt folder>/sizes.txt"` totals. A file may belong to more than one piece; say so in the lines column.

Then the findings, most weight first. The design reader numbers its findings `D1`, `D2`, and so on; hunters number theirs `#1`, `#2`, and so on. Each finding is a block of labelled lines:

```
#3 · sign 1 · judgement · risk med
Where: src/Cases/Jobs/RetryScheduler.cs:12-140 (also src/Cases/Jobs/RetryStore.cs:1-60)
What: A 200-line scheduler re-runs failed notification sends with its own backoff, a lease table, and a poll loop.
Replace with: Polly's retry pipeline (Polly 8.4 is already referenced in Cases.csproj) around Notifier.SendAsync; drop the lease table.
Removes: about 200 lines, one table, one hosted service.
Users lose: nothing on a live send; a failed send is no longer retried after an app restart (the lease table survives one, an in-process retry doesn't).
Proof: Delta against Polly: backoff and jitter (covered), restart survival (not covered). No spec, test, or instruction asks for restart survival (searched docs/, the tests, and AGENTS.md). History: 4f2a9c1 added the lease table "so a deploy doesn't drop sends".
Against: A deploy mid-retry loses that send, which the lease table was added to stop.
Protected by: NotifierTests.SendFailure_IsRetried (tests/Cases/NotifierTests.cs:41) pins the retry; nothing pins restart survival.
```

- **Heading:** `#N` or `D<n>`, the sign's number, `proven` or `judgement`, and the risk (scale below).
- **Where:** `file:line` and every other location.
- **What:** what it is, in a sentence or two.
- **Replace with:** the specific API, library, or existing repo code; "delete"; or "hand to <the host, the caller, or a library>". One replacement per finding.
- **Removes:** what goes (lines, types, concepts, dependencies).
- **Users lose:** "none", or exactly what users lose.
- **Proof:** how it was checked, by the standard the sign sets; for a guard or a copy, the commit hash for its history.
- **Against:** the best case for keeping it, in one line. Judgement findings only.
- **Protected by:** the build; the test, by name, that pins the behaviour and that no finding touches; the tests that change with it, for a behaviour the finding drops; or none.

A finding that removes fewer than about ten lines and changes no behaviour is **cleanup**: list it after the findings under `Cleanup`, one short line each (`file:line · what · replace with`), not as a block.

Risk:

- **low**: a change the compiler or the type checker proves (an unreferenced private member, an unused import), or private or internal code whose behaviour a test pins: a test that names the symbol or drives its entry point, found by searching the tests.
- **med**: the change crosses files or layers, no test pins the behaviour it touches, or it changes behaviour that users would only see in an edge or an error message.
- **high**: a published package's public API, a consumer outside the repo, a persisted or wire shape, a behaviour change users would notice without being told, a behaviour edge (an error path, a fallback someone may rely on) that no test pins, or a deleted or weakened test of live code.

Then `Also noticed`: bugs the writer tripped over, one line each (`file:line · what goes wrong`), marked `data loss` or `security` when they are, or `none`. Re-derived server rules, tests that can't fail, and any broken house Law a sign above covers aren't Also-noticed bugs: they're findings under their sign. Then `Leads dropped`: the leads checked and dropped, one line each with why; "no exact replacement" isn't a reason (sign 1). A hunter ends with one last line, `Not read in full: none`, or `Not read in full:` followed by the paths of the files it didn't read in full, separated by `, `; that last line marks the report complete. The design reader has no such line. Facts and arguments only: one replacement per finding, and no options or asks.
