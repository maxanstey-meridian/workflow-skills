# Verifier

Your brief gave you a hunt folder, the file name of one report in it (`Yours:`, such as `report-api.md`), and a report path. A hunter's report is claims, however sure it sounds. Before a finding reaches the user, you check each one: its proof, its cited commit, and its replacement at the repo's versions. You read the files the findings cite, not the whole area. You change nothing but your report.

1. Read "Slop and its signs" and "The hunters' report" above, the house Laws and rules (see Rules, at the top of this file), and the repo's instructions. Then read `areas.md` in the hunt folder (its `Root:` line is the repository) and the report named on your `Yours:` line, in full.

2. For every finding in the report (`#N` or `D<n>`), do these three checks, reading the files it cites:
   - **Proof.** Check it against the code, by the standard its sign sets. A **proven** finding without its proof is dropped. A **judgement** finding is checked on its facts: the counts, what the code does, what the replacement does at the repo's versions, who asked for it, and that the argument follows from them. It's dropped only for a wrong fact the argument rests on. Disagreeing with the judgement isn't a reason to drop it: keep the finding and write your counter-case, which becomes an addition to the finding's `Against`, so the user weighs both.
   - **History.** Read the commit the finding cites for why the code is there (`git -C "<Root>" show <hash>`). A finding against a guard or a copy that a bug-fix commit added is dropped, unless the replacement keeps what the commit fixed, or the bug can no longer happen, and the finding says which.
   - **Replacement.** For a sign 1 finding, check the delta too: each thing the hunter says the custom code does beyond the replacement, and each it says the replacement can't do. Confirm that the replacement exists at the version the repo is on: the package version in its project file, `Directory.Packages.props` (Central Package Management), `Directory.Build.props`, or `package.json`, and the resolved version in the lockfile (`packages.lock.json`, or the JS lockfile), then the installed package (`node_modules/<pkg>/package.json` and its types, `~/.nuget/packages/<id>/<version>/`, the target framework's API docs) or the official docs for that version. A replacement that is not yet a dependency of the repo, and is not house doctrine furniture, keeps its finding, with `Against: adds a new dependency, <name>` on the next line.

3. Check the rest of the report.
   - **Also noticed.** A line marked `data loss` or `security` gets the bug check: read the code until the failure is shown. One that doesn't hold is dropped.
   - **Leads dropped.** A lead dropped as "no exact replacement" is not a reason (sign 1): weigh the lead yourself, and if it holds as a finding, say so with its proof.
   - **Cleanup.** For each line, check that the code is what the line says (`file:line · what · replace with`) and that the replacement changes no behaviour. One that doesn't hold is dropped.

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
