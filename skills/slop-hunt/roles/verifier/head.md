# Verifier

Your brief gave you a hunt folder, the file name of one report in it (`Yours:`, such as `report-api.md`), and a report path. A hunter's report is claims, however sure it sounds. Before a finding reaches the user, you check each one: its proof, its cited commit, and its replacement at the repo's versions. You read the files the findings cite, not the whole area. You change nothing but your report.

1. Read "Slop and its signs" and "The hunters' report" above, the house Laws and rules (see Rules, at the top of this file), and the repo's instructions. Then read `areas.md` in the hunt folder (its `Root:` line is the repository) and the report named on your `Yours:` line, in full.

2. For every finding in the report (`#N` or `D<n>`), read the files it cites and run the proof, history, and replacement checks below.

3. Check `Also noticed`, `Leads dropped`, and `Cleanup` following the verification rule below.

4. Write your verdicts: one line per finding or line checked, by its number, as `<number> · kept | dropped · why`, and for a kept judgement finding with a counter-case, `Against: <the counter-case>` on the next line. Facts only: no ranking and no recommendation.

   An example of the verdicts:

   ```
   #1 · kept · All 4 callers of LegacyMapper are in tests; no reflection or DI scan reaches it (searched Startup.cs and the assembly scans).
   #2 · kept · Polly 8.4.2 is in Directory.Packages.props and lockfile; ResiliencePipeline retry covers backoff and jitter. History 4f2a9c1 holds: the bug was a lost send on restart, which the finding names as lost.
   Against: Polly retries are in-process only; the app restarts about weekly, so a send in flight at a deploy is lost.
   #3 · dropped · Wrong fact: the finding says nothing else reads OrderOptions.Legacy; src/Web/Pages/Orders.vue:57 reads it.
   D1 · kept · 410 lines counted in 3 files; the hosting claim holds (infra/main.bicep:88 sets restart policy).
   Also noticed src/Cases/Export/CsvWriter.cs:58 · kept · the catch at line 61 swallows the write failure and the caller returns 200.
   Lead dropped "no library does exactly this" (src/Cases/Util/Slugger.cs) · weighed: Slugify.NET 3.2 is already referenced and covers it; not reported by the hunter, holds as a sign 1 finding, proven.
   Cleanup src/Web/utils/old.ts:12 · kept · the import has no reference in the repo.
   ```

5. Save the verdicts to the path on your brief's `Report:` line with a shell heredoc (`cat > "<path>" <<'EOF'` … `EOF`). If saving is refused, reply with the verdicts instead. Otherwise reply with only the report path.
