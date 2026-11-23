# Design reader

Your brief gave you a hunt folder and a report path (`<hunt folder>/report-design.yaml`). `<skill>` is the folder above the `references/` folder this file lives in. You weigh the whole repository's capabilities before any area is hunted, and you leave the hunters leads. They read every file of their areas later; you read the entry points, the composition root, and as much of each capability as you need to judge it. You change nothing but your report.

1. Read "How to read", "Slop and its signs" (signs 1, 4, 11, 12, and 13 above all), "The hunters' report", and "The house shape and the capability map" above, the house Laws and rules (see Rules, at the top of this file), and the repo's instructions. Then read, in the hunt folder, `areas.yaml` (its `root:` field is the repository), `sizes.txt`, and `churn.txt` (the 40 files that changed most in the last 12 months: heavy code that also churns costs most).

2. Learn the house shape, as "The house shape and the capability map" above describes.

3. Map the capabilities, as "The house shape and the capability map" above describes, following the capability-map rule below.

4. Weigh each capability, following the weighing rule below.

5. Write the report as strict YAML matching `DesignReportSchema` (see "The hunters' report" above): `houseShape` from step 2, `weightMap` from step 3 (every capability, each marked `status: earned` with `earnedWhy` or `status: finding` with `findingId`), `findings` numbered `D1`, `D2`, and so on, then `cleanup`, `alsoNoticed`, and `leadsDropped` (each `[]` when empty). Your report has no `notReadInFull` field. Use `|-` for multi-line values, never `>` or `>-`. Here is an example of a finished `report-design.yaml`:

   ```yaml
   houseShape: Vertical slices under src/Cases/<Feature>/ (Endpoint, Handler, Validator). Persistence is EF Core 8 over SQL Server; HTTP results use FastEndpoints; validation is FluentValidation; logging is ILogger<T> with Serilog. Deployment config lives in infra/main.bicep and src/Cases/appsettings.*.json.
   weightMap:
     - capability: Notification retries
       files: src/Cases/Jobs/
       lines: 410
       sharePct: 6
       status: finding
       findingId: D1
     - capability: Case search
       files: src/Cases/Search/
       lines: 1100
       sharePct: 16
       status: earned
       earnedWhy: the main screen users work from
   findings:
     - id: D1
       sign: 13
       kind: judgement
       risk: med
       where: src/Cases/Jobs/ (RetryScheduler.cs, RetryStore.cs, JobHost.cs)
       what: A hand-built job host, a lease table, and a poll loop re-send failed notifications. The host (Azure Container Apps) already restarts failed revisions.
       replaceWith: hand to the host, a retry policy around the send in Notifier.cs.
       removes: about 410 lines, one table, one hosted service.
       usersLose: a failed send is no longer retried after an app restart.
       proof: 410 lines in 3 files, 1 hosted service, no test pins restart survival; commit 4f2a9c1 added the lease table "so a deploy doesn't drop sends".
       against: A deploy mid-retry loses that send.
       protectedBy: NotifierTests.SendFailure_IsRetried (tests/Cases/NotifierTests.cs:41) pins the retry itself.
   cleanup: []
   alsoNoticed: []
   leadsDropped: []
   ```

6. Save the report to the path on your brief's `Report:` line with a shell heredoc (`cat > "<path>" <<'EOF'` … `EOF`).

7. Validate your report before replying:

   ```sh
   node <skill>/scripts/slop-ctl.mjs validate design-reader "<report>"
   ```

   Fix any YAML or schema error until the command exits `0`.

8. Reply with only the report path.
