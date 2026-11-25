# Verifier

Your brief gave you a hunt folder, the file name of one report in it (`Yours:`, such as `report-api.yaml` or `report-design.yaml`), and a report path (`<hunt folder>/verify-<x>.yaml`). `<skill>` is the folder above the `references/` folder this file lives in. A hunter's report is claims, however sure it sounds. Before a finding reaches the user, you check each one: its proof, its cited commit, and its replacement at the repo's versions. You read the files the findings cite, not the whole area. You change nothing but your report.

1. Read "Slop and its signs" and "The hunters' report" above, the house Laws and rules (see Rules, at the top of this file), and the repo's instructions. Then read `areas.yaml` in the hunt folder (its `root:` field is the repository) and the report named on your `Yours:` line, in full.

2. For every finding in the report (`#N` or `D<n>`), read the files it cites and run the proof, history, and replacement checks below.

3. Check `alsoNoticed`, `leadsDropped`, and `cleanup` following the verification rule below.

4. Write your verdicts as strict YAML matching the schema below (`verdicts`, `alsoNoticedVerdicts`, `cleanupVerdicts`, and `raisedFromDroppedLeads`, each `[]` when empty). Every finding in the target report, every `alsoNoticed` entry tagged `data-loss` or `security`, and every `cleanup` entry must have a matching verdict with no duplicate targets. For a kept judgement finding with a counter-case (or a sign 1 replacement that adds a new dependency), set `against` on that verdict. Use `|-` for multi-line values, never `>` or `>-`. Facts only: no ranking and no recommendation.

   Report schema:

   <!-- schema: VerifyReportSchema -->

   An example of a finished `verify-<x>.yaml`:

   ```yaml
   verdicts:
     - target: "#1"
       verdict: kept
       why: All 4 callers of LegacyMapper are in tests; no reflection or DI scan reaches it (searched Startup.cs and the assembly scans).
     - target: "#2"
       verdict: kept
       why: Polly 8.4.2 is in Directory.Packages.props and lockfile; ResiliencePipeline retry covers backoff and jitter. History 4f2a9c1 holds; the bug was a lost send on restart, which the finding names as lost.
       against: Polly retries are in-process only; the app restarts about weekly, so a send in flight at a deploy is lost.
     - target: "#3"
       verdict: dropped
       why: "Wrong fact: the finding says nothing else reads OrderOptions.Legacy; src/Web/Pages/Orders.vue:57 reads it."
   alsoNoticedVerdicts:
     - where: src/Cases/Export/CsvWriter.cs:58
       verdict: kept
       why: The catch at line 61 swallows the write failure and the caller returns 200.
   cleanupVerdicts:
     - where: src/Web/utils/old.ts:12
       verdict: kept
       why: The import has no reference in the repo.
   raisedFromDroppedLeads:
     - where: src/Cases/Util/Slugger.cs
       sign: 1
       kind: proven
       why: Slugify.NET 3.2 is already referenced and covers it; not reported by the hunter.
   ```

5. Save the verdicts to the path on your brief's `Report:` line with a shell heredoc (`cat > "<path>" <<'EOF'` … `EOF`).

6. Validate your report against the target report before replying:

   ```sh
   node <skill>/scripts/slop-ctl.mjs validate verifier "<report>" --report "<hunt folder>/<Yours>"
   ```

   Fix any YAML, schema, or cross-check error until the command exits `0`.

7. Reply with only the report path.
