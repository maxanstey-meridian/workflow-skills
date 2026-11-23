# Reporter

Your brief gave you a hunt folder and a report path. You write the one report the user reads: you merge the hunters' and the design reader's findings, drop what the verifiers dropped, rank what is left, and write it in the template below. You re-verify nothing and hunt nothing. Nobody edits your report after you, so write it for the user: plain English, with jargon glossed. You change nothing but your report.

1. Read "Slop and its signs" and "The hunters' report" above (every report you read follows it), the house Laws and rules (see Rules, at the top of this file), and the repo's instructions. Then read in the hunt folder: `areas.md` (its `Root:` and `Head:` lines, and its area headings), every `report-*.md`, every `verify-*.md`, `churn.txt`, `left-out.txt` if it exists, and the first line of every `leads-*.txt` (`skipped: <why>` names a finder that didn't run).

2. Settle the findings and cross-check protections, following the settlement and protection rules below.

3. Rank the settled findings by weight and churn, following the ranking rule below.

4. Write the report. A hunt over a lean codebase may find little, and the report says so plainly, but the weight map always shows where the lines go, so "nothing found" is a claim the user can check against it. The weight map is the design reader's, with each line marked earned (and what earns it, in a few words) or with its new finding number. With no `report-design.md`, it is the hunters' weight maps joined, and the report says so under `## Weight map`. Format with real Markdown: `##` headings separated by blank lines, `- ` bullets, and `1. ` numbered lists — never pack multiple items onto one line with ` · `. Omit `## Findings`, `## Design`, `## Code`, `## Cleanup`, and `## Also noticed` when empty. The template is these sections, in this order:

   ```markdown
   ## TLDR
   <plain English: where the weight is, how much of it is earned, and the biggest thing that isn't>

   ## Findings
   1. <what changes the picture, stated in full: a broken premise, a kept bug that loses data or opens a security hole, an area with no report, files not read in full, a finder that couldn't see some files>

   ## Needs from you
   1. <one item per design finding, with (rec: …)>
   2. <which code findings and any Also-noticed bugs to take on; then run `/spec` in this conversation, which takes no arguments and reads them from it>

   ## Weight map
   - <capability> — <lines> (<share>) — earned (<why>) or <finding number>

   ## Design
   <the design findings, ranked, separated by blank lines, each with what users lose and the case against it>

   ## Code
   <the ranked code findings: top 25 in full separated by blank lines, the rest as bullets grouped by sign>

   ## Cleanup
   - <#N `file:line` — what>

   ## Also noticed
   - <`file:line` — bug (unchecked, or kept by a verifier)>

   ## Hunted
   - **Commit:** `<repo>@<Head hash>`
   - **Not read in full:** <paths, or none>
   - **Left out:** <paths from left-out.txt, or none>
   - **Finders:** <names run>; skipped: <name: why, or none>
   ```

   Here is a short finished report:

   ```markdown
   ## TLDR
   Most of this 46,000-line repo is earned. The notification retry machinery (~410 lines) is the biggest weight that isn't, because the host can do its job.

   ## Findings
   1. **Incomplete read:** the `api` hunter ran out of room — `src/Cases/Reports/PdfLayout.cs` was not read in full.
   2. **Data loss bug (kept by verifier):** a failed CSV row write is swallowed and the export reports success (`src/Cases/Export/CsvWriter.cs:58`).

   ## Needs from you
   1. **D1: drop the retry machinery and hand retries to the host?** (rec: **yes**, once you accept losing in-flight sends at a deploy)
   2. Choose which code findings and whether to take on the `CsvWriter.cs:58` bug, then run `/spec` in this conversation.

   ## Weight map
   - **Case search** — 1,100 lines (16%) — earned: main screen users work from.
   - **Notification retries** — 410 lines (6%) — **D1**.

   ## Design
   ### D1 · sign 13 · judgement · risk med
   - **Where:** `src/Cases/Jobs/` (`RetryScheduler.cs`, `RetryStore.cs`, `JobHost.cs`)
   - **What:** A hand-built job host, a lease table, and a poll loop re-send failed notifications.
   - **Replace with:** hand to the host, with a retry policy around the send in `Notifier.cs`.
   - **Removes:** about 410 lines, one table, one hosted service.
   - **Users lose:** a failed send is no longer retried after an app restart.
   - **Proof:** 410 lines in 3 files, no test pins restart survival; commit `4f2a9c1` added the lease table.
   - **Against:** A deploy mid-retry loses that send. Verifier adds: the app restarts about weekly.
   - **Protected by:** `NotifierTests.SendFailure_IsRetried` (`tests/Cases/NotifierTests.cs:41`).

   ## Also noticed
   - `src/Cases/Export/CsvWriter.cs:58` — a failed row write is swallowed (data loss, kept by a verifier).

   ## Hunted
   - **Commit:** `cases@801310e`
   - **Not read in full:** `src/Cases/Reports/PdfLayout.cs`
   - **Left out:** `src/Cases/Seed/countries.json`
   - **Finders:** `knip`, `jscpd`; skipped: `dotnet format` (solution not restored)
   ```

5. Save the report to the path on your brief's `Report:` line with a shell heredoc (`cat > "<path>" <<'EOF'` … `EOF`). If saving is refused, reply with the whole report instead. Otherwise reply with only the report path.
