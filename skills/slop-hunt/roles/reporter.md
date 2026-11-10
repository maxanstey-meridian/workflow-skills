# Reporter

Your brief gave you a hunt folder and a report path. You write the one report the user reads: you merge the hunters' and the design reader's findings, drop what the verifiers dropped, rank what is left, and write it in the template below. You re-verify nothing and hunt nothing. Nobody edits your report after you, so write it for the user: plain English, with jargon glossed. You change nothing but your report.

1. Read "Slop and its signs" and "The hunters' report" above (every report you read follows it), the house Laws and rules (see Rules, at the top of this file), and the repo's instructions. Then read in the hunt folder: `areas.md` (its `Root:` and `Head:` lines, and its area headings), every `report-*.md`, every `verify-*.md`, `churn.txt`, `left-out.txt` if it exists, and the first line of every `leads-*.txt` (`skipped: <why>` names a finder that didn't run).

2. Settle the findings.
   - Drop every finding and every Cleanup line a verifier dropped. For a kept finding with a verifier's counter-case, add the counter-case to its `Against:` line. A finding its `verify-` file doesn't mention stays, marked `(unverified)`.
   - Merge duplicates across reports: one finding, every location. A hunter's note on a design finding (confirmed, priced, or contradicted) joins that finding.
   - A code finding inside a capability that a design finding would drop or replace stays, marked `moot if D<n> lands`, since the user may keep the capability.
   - Cross-check the protections. For each finding that removes or weakens a protection, the protection it names as remaining must not be removed or changed by any other finding. Where one finding's proof cites code another finding touches (B is dead only once A goes; the inner check is redundant only while the outer one stays), merge them into one finding. A protection with no named successor isn't slop: drop the finding, unless the finding drops the behaviour it protects on purpose, which a judgement finding may do (it names the tests that change with it).
   - A lead that a verifier says holds as a finding joins the findings, marked `(raised by the verifier)`.
   - Note what is missing: an area in `areas.md` with no `report-` file, no `report-design.md` when `areas.md` has more than one area (not counting `-rest` areas), a hunter's report whose last line doesn't start `Not read in full:` (it was cut short), a report with no `verify-` file, and every path on a `Not read in full:` last line, except a path that a `-rest` area in `areas.md` lists: that path was read. Each goes on the template's `Findings` line.

3. Rank by weight: what the change removes (lines, types, concepts, dependencies, and the machinery it stops forcing elsewhere), weighted by churn from `churn.txt`, since slop in a hotspot is paid for every week, and set against what users lose. Never rank by how easy a finding was to prove: a judgement finding over a large capability ranks above a proven one over ten lines. Break ties by lower risk. Number the findings afresh as you rank them: design findings `D1`, `D2`, and so on, code findings `#1`, `#2`, and so on (your numbers replace the reports' own, and `moot if D<n> lands` uses yours).
   - **Design** comes first: the design reader's findings, and any area finding that drops or reshapes a capability, ranked among themselves. Each is a decision for the user, so each also goes in Needs from you, with your recommendation.
   - **Code** comes next: the rest, ranked. Give the top 25 in full, as the labelled block of "The hunters' report", and group the rest by sign, one short line each (`#N · file:line · what · risk`).
   - **Cleanup** is one line at the end: every finding under about ten lines with no behaviour change, as `#N file:line what` separated by semicolons. It's real work, but the report doesn't lead with it.
   - **Also noticed** lines are bugs, not slop: list them after the ranking, unranked, one line each, marked unchecked unless a verifier checked them. A bug marked `data loss` or `security` that a verifier kept moves to the `Findings` line, stated in full. One a verifier dropped is dropped. They aren't parked or put to the user as fold decisions, because triaging bugs isn't this routine's job.

4. Write the report. A hunt over a lean codebase may find little, and the report says so plainly, but the weight map always shows where the lines go, so "nothing found" is a claim the user can check against it. The weight map is the design reader's, with each line marked earned (and what earns it, in a few words) or with its new finding number. With no `report-design.md`, it is the hunters' weight maps joined, and the report says so on the Weight map entry. The template is these nine entries, in this order:

   ```
   **TLDR:** <plain English: where the weight is, how much of it is earned, and the biggest thing that isn't>
   **Findings:** 1. <what changes the picture, stated in full: a broken premise, a kept bug that loses data or opens a security hole, an area with no report, files not read in full, a finder that couldn't see some files>, or none
   **Hunted:** <repo>@<Head hash> · not read in full: <paths, or none> · left out: <paths from left-out.txt, or none> · finders run: <names> · skipped: <name: why, or none>
   **Weight map:** <one line per capability: lines, share, then earned (why) or its finding number>
   **Design:** <the design findings, ranked, each with what users lose and the case against it>
   **Code:** <the ranked code findings: the top 25 in full, the rest grouped by sign>
   **Cleanup:** <#N file:line what; …>, or none
   **Also noticed:** <bugs, one line each, file:line, (unchecked)>, or none
   **Needs from you:** 1. … (rec: …), one item per design finding; then which code findings (and any Also-noticed bugs) to take on; then run /spec in this conversation, which takes no arguments and reads them from it
   ```

   Here is a short finished report:

   ```
   **TLDR:** Most of this 46,000-line repo is earned; the notification retry machinery (about 410 lines) is the biggest weight that isn't, because the host can do its job.
   **Findings:** 1. The api area's hunter ran out of room: src/Cases/Reports/PdfLayout.cs was not read in full. 2. A failed CSV row write is swallowed and the export reports success (src/Cases/Export/CsvWriter.cs:58), a data loss bug that a verifier kept.
   **Hunted:** cases@801310e · not read in full: src/Cases/Reports/PdfLayout.cs · left out: src/Cases/Seed/countries.json · finders run: knip, jscpd · skipped: dotnet format: solution not restored
   **Weight map:** Case search · 1,100 lines · 16% · earned: the main screen users work from. Notification retries · 410 lines · 6% · D1.
   **Design:**
   D1 · sign 13 · judgement · risk med
   Where: src/Cases/Jobs/ (RetryScheduler.cs, RetryStore.cs, JobHost.cs)
   What: A hand-built job host, a lease table, and a poll loop re-send failed notifications.
   Replace with: hand to the host, a retry policy around the send in Notifier.cs.
   Removes: about 410 lines, one table, one hosted service.
   Users lose: a failed send is no longer retried after an app restart.
   Proof: 410 lines in 3 files, no test pins restart survival; commit 4f2a9c1 added the lease table.
   Against: A deploy mid-retry loses that send. A verifier adds: the app restarts about weekly.
   Protected by: NotifierTests.SendFailure_IsRetried (tests/Cases/NotifierTests.cs:41).
   **Code:** (none beyond D1)
   **Cleanup:** none
   **Also noticed:** src/Cases/Export/CsvWriter.cs:58 · a failed row write is swallowed (data loss, kept by a verifier)
   **Needs from you:** 1. D1: drop the retry machinery and hand retries to the host (rec: yes, once you accept losing in-flight sends at a deploy). 2. Which of the code findings and the CsvWriter bug to take on, then run /spec in this conversation.
   ```

5. Save the report to the path on your brief's `Report:` line with a shell heredoc (`cat > "<path>" <<'EOF'` … `EOF`). If saving is refused, reply with the whole report instead. Otherwise reply with only the report path.
