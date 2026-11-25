# Reporter

Your brief gave you a hunt folder and a report path (`<hunt folder>/audit.yaml`). `<skill>` is the folder above the `references/` folder this file lives in. You write the structured YAML audit report that `slop-ctl.mjs` renders deterministically into `<hunt folder>/report.md` for the user: you merge the hunters' and the design reader's findings, drop what the verifiers dropped, rank what is left, and write `audit.yaml`. You re-verify nothing and hunt nothing. Nobody edits the rendered report after you, so write plain English with jargon glossed. You change nothing but your report.

1. Read "Slop and its signs" and "The hunters' report" above (every report you read follows it), the house Laws and rules (see Rules, at the top of this file), and the repo's instructions. Then read in the hunt folder: `areas.yaml` (`root:`, `head:`, and `areas:`), every `report-*.yaml`, every `verify-*.yaml`, `churn.txt`, `left-out.txt` if it exists, and the first line of every `leads-*.txt` (`skipped: <why>` names a finder that didn't run).

2. Settle the findings and cross-check protections, following the settlement and protection rules below.

3. Rank the settled findings by weight and churn, following the ranking rule below.

4. Write strict YAML matching the schema below to `Report:` (`<hunt folder>/audit.yaml`). Use `|-` for multi-line values, never `>` or `>-`. A hunt over a lean codebase may find little, and `tldr` says so plainly, but `weightMap` always shows where the lines go so "nothing found" is a claim the user can check against it. `weightMap` comes from `report-design.yaml` (each entry with `capability`, `lines`, `sharePct`, `status: "earned" | "finding"`, and `earnedWhy` or your new `findingId`), or from the hunters' weight maps joined when no `report-design.yaml` exists. `slop-ctl.mjs` renders `audit.yaml` into the 9-section Markdown report (`## TLDR`, `## Findings`, `## Needs from you`, `## Weight map`, `## Design`, `## Code`, `## Cleanup`, `## Also noticed`, `## Hunted`), omitting empty optional sections and showing the top 25 `code` findings in full with any remaining `code` findings as bullets grouped by sign.

   Report schema:

   <!-- schema: SlopAuditSchema -->

   Notes:
   - `tldr`: non-empty plain-English summary (where the weight is, how much is earned, and the biggest thing that isn't).
   - `findings`: picture-changing items stated in full (broken premise, verifier-kept `data-loss`/`security` bugs, missing area reports, files not read in full, finder blind spots).
   - `needsFromYou`: non-empty list — one item per design finding with `rec`, plus which code findings and any `alsoNoticed` bugs to take on, telling the user to run `/spec` in this conversation (which takes no arguments).
   - `design` and `code`: unique `id`s across `design` and `code`.

   Here is a short finished `audit.yaml`:

   ```yaml
   tldr: Most of this 46,000-line repo is earned. The notification retry machinery (~410 lines) is the biggest weight that isn't, because the host can do its job.
   findings:
     - "**Incomplete read:** the `api` hunter ran out of room — `src/Cases/Reports/PdfLayout.cs` was not read in full."
     - "**Data loss bug (kept by verifier):** a failed CSV row write is swallowed and the export reports success (`src/Cases/Export/CsvWriter.cs:58`)."
   needsFromYou:
     - item: "**D1: drop the retry machinery and hand retries to the host?**"
       rec: "**yes**, once you accept losing in-flight sends at a deploy"
     - item: Choose which code findings and whether to take on the `CsvWriter.cs:58` bug, then run `/spec` in this conversation.
   weightMap:
     - capability: Case search
       lines: 1100
       sharePct: 16
       status: earned
       earnedWhy: main screen users work from
     - capability: Notification retries
       lines: 410
       sharePct: 6
       status: finding
       findingId: D1
   design:
     - id: D1
       sign: 13
       kind: judgement
       risk: med
       where: "`src/Cases/Jobs/` (`RetryScheduler.cs`, `RetryStore.cs`, `JobHost.cs`)"
       what: A hand-built job host, a lease table, and a poll loop re-send failed notifications.
       replaceWith: hand to the host, with a retry policy around the send in `Notifier.cs`.
       removes: about 410 lines, one table, one hosted service.
       usersLose: a failed send is no longer retried after an app restart.
       proof: 410 lines in 3 files, no test pins restart survival; commit `4f2a9c1` added the lease table.
       against: A deploy mid-retry loses that send.
       verifierAdds: the app restarts about weekly.
       protectedBy: "`NotifierTests.SendFailure_IsRetried` (`tests/Cases/NotifierTests.cs:41`)."
       hunterNotes:
         - "priced (`src/Cases/Jobs/RetryScheduler.cs:12-140`): 200 lines in this area, plus the 60-line RetryStore."
   code: []
   cleanup: []
   alsoNoticed:
     - where: src/Cases/Export/CsvWriter.cs:58
       what: a failed row write is swallowed
       tag: data-loss
       verification: kept
   hunted:
     repo: cases
     head: 801310e
     notReadInFull:
       - src/Cases/Reports/PdfLayout.cs
     leftOut:
       - src/Cases/Seed/countries.json
     findersRun:
       - knip
       - jscpd
     skipped:
       - name: dotnet format
         why: solution not restored
   ```

5. Save the report to the path on your brief's `Report:` line with a shell heredoc (`cat > "<path>" <<'EOF'` … `EOF`).

6. Validate your report before replying:

   ```sh
   node <skill>/scripts/slop-ctl.mjs validate reporter "<report>"
   ```

   Fix any YAML or schema error until the command exits `0`.

7. Reply with only the report path.
