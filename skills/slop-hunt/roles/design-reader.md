# Design reader

Your brief gave you a hunt folder and a report path. You weigh the whole repository's capabilities before any area is hunted, and you leave the hunters leads. They read every file of their areas later; you read the entry points, the composition root, and as much of each capability as you need to judge it. You change nothing but your report.

1. Read "How to read", "Slop and its signs" (signs 1, 4, 11, 12, and 13 above all), "The hunters' report", and "The house shape and the capability map" above, the house Laws and rules (see Rules, at the top of this file), and the repo's instructions. Then read, in the hunt folder, `areas.md` (its `Root:` line is the repository), `sizes.txt`, and `churn.txt` (the 40 files that changed most in the last 12 months: heavy code that also churns costs most).

2. Learn the house shape, as "The house shape and the capability map" above describes.

3. Map the capabilities, as "The house shape and the capability map" above describes. Build the map from the composition root, the folder layout, the entry points, and `sizes.txt`.

   Done when every top-level folder in `sizes.txt` with over 2% of scope belongs to a line of the map.

4. Weigh each capability. For every one, and above all one that forces machinery on others (a check that rules libraries out, a format others must write to), say what it gives users; what the cheapest shape that gives them that is (the platform, a library, the host's or caller's job, a smaller design, or nothing); what users would lose; and what the change would cost. A capability that costs more than it gives, or that has a cheaper shape, is a finding. One that earns its size is marked earned in the map, with what earns it.

5. Write the report as "The hunters' report" above describes: first the house shape from step 2, then the weight map from step 3 (every capability, each marked earned or with its finding number), then the findings numbered `D1`, `D2`, and so on, then `Cleanup`, `Also noticed`, and `Leads dropped`. Your report has no `Not read in full:` line. Here is the start of a finished report:

   ```
   House shape: vertical slices under src/Cases/<Feature>/ (Endpoint, Handler, Validator). Persistence is EF Core 8 over SQL Server; HTTP results use FastEndpoints; validation is FluentValidation; logging is ILogger<T> with Serilog. Deployment config lives in infra/main.bicep and src/Cases/appsettings.*.json.
   Notification retries · src/Cases/Jobs/ · 410 lines · 6% · D1
   Case search · src/Cases/Search/ · 1,100 lines · 16% · earned: the main screen users work from
   Retention sweep · src/Cases/Retention/ · 780 lines · 11% · D2
   D1 · sign 13 · judgement · risk med
   Where: src/Cases/Jobs/ (RetryScheduler.cs, RetryStore.cs, JobHost.cs)
   What: A hand-built job host, a lease table, and a poll loop re-send failed notifications. The host (Azure Container Apps) already restarts failed revisions.
   Replace with: hand to the host, a retry policy around the send in Notifier.cs.
   Removes: about 410 lines, one table, one hosted service.
   Users lose: a failed send is no longer retried after an app restart.
   Proof: 410 lines in 3 files, 1 hosted service, no test pins restart survival; commit 4f2a9c1 added the lease table "so a deploy doesn't drop sends".
   Against: A deploy mid-retry loses that send.
   Protected by: NotifierTests.SendFailure_IsRetried (tests/Cases/NotifierTests.cs:41) pins the retry itself.
   ```

6. Save the report to the path on your brief's `Report:` line with a shell heredoc (`cat > "<path>" <<'EOF'` … `EOF`). If saving is refused, reply with the whole report instead. Otherwise reply with only the report path.
