## Check Also noticed, Leads dropped, and Cleanup

**Law:** Read the code for every `Also noticed` line marked `data loss` or `security` and drop any that do not hold, weigh any lead dropped as "no exact replacement" (sign 1) yourself and report it with proof if it holds, and verify every `Cleanup` line matches the code (`file:line · what · replace with`) and changes no behaviour.

**When:** Checking the non-finding sections of a hunter or design-reader report.

Bad: Passing an `Also noticed` `data loss` claim through unchecked, or leaving a "no library does exactly this" dropped lead unexamined.
Good: Reading `CsvWriter.cs:58` to confirm the swallowed write failure, weighing the dropped `Slugger.cs` lead against `Slugify.NET 3.2`, and verifying each `Cleanup` line against its file.
