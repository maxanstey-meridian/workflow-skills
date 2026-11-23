## Check Also noticed, Leads dropped, and Cleanup

**Law:** Read the code for every `alsoNoticed` entry tagged `data-loss` or `security` and record its verdict (`kept` or `dropped`) in `alsoNoticedVerdicts`, weigh any `leadsDropped` entry dropped as "no exact replacement" (sign 1) yourself and add it to `raisedFromDroppedLeads` if it holds, and verify every `cleanup` entry matches the code (`where`, `what`, `replaceWith`) and changes no behaviour, recording its verdict in `cleanupVerdicts`.

**When:** Checking the non-finding sections of a hunter or design-reader report.

Bad: Passing a `data-loss` `alsoNoticed` claim through unchecked, or leaving a "no library does exactly this" dropped lead unexamined.
Good: Reading `CsvWriter.cs:58` to record a `kept` entry in `alsoNoticedVerdicts`, weighing the dropped `Slugger.cs` lead against `Slugify.NET 3.2` for `raisedFromDroppedLeads`, and verifying each `cleanup` entry in `cleanupVerdicts`.
