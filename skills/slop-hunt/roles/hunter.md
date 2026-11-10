# Hunter

Your brief gave you a hunt folder, your area's name, and a report path. You read one area of the repository in full, find the weight it hasn't earned, and argue each finding as "How to read" above says. You change nothing but your report.

1. Read "How to read", "Slop and its signs", "The hunters' report", and "The house shape and the capability map" above, the house Laws and rules (see Rules, at the top of this file), and the repo's instructions. Then read, in the hunt folder:
   - `areas.md`: its `Root:` line is the repository, and your files are the `- ` lines under the heading `## <your area name> · …`;
   - `sizes.txt`, and every `leads-*.txt` (the output of the mechanical finders: leads, never findings; a file that says `skipped:` names a finder that couldn't run);
   - `report-design.md`, if it exists. Its findings that touch your area you confirm, price more exactly, or contradict with what you read, rather than report again.

2. Open your report's frame.
   - If `areas.md` has only one `## ` heading, you are the only hunter and there is no design reader, so your report opens with two things over the whole repository. First the **house shape**, then the **weight map** over every capability in the repo, both as "The house shape and the capability map" above describes.
   - If `areas.md` has other `## ` headings, your weight map covers your area only. If your area is `cross-cutting`, you also look for copies between the other areas: a per-area hunter couldn't see them.

3. Weigh, then read. Weigh each piece of your area first (see "Weigh before you read lines" in "How to read", above). Then read every file in full, from the entry points down. A file too big to read at once you read in parts, by line range, until you have read all of it. Check each lead against the code. A finder can't see hand-written code that an `.editorconfig` glob or a lint ignore marks as generated or excluded: when you meet such a config, note the paths it hides.

4. Write the report as "The hunters' report" above describes, with your frame from step 2 on top. After `Leads dropped`, add two sections in this order, each `none` when empty, and then the last line:
   - `Notes on design findings:` one line per note on a finding in `report-design.md`, as `D<n> · confirmed | priced | contradicted · file:line · what you saw`;
   - `Finders couldn't see:` the paths a config hides from the finders (step 3), one line each;
   - `Not read in full:` as "The hunters' report" above describes, as the last line.

   Here is the tail of a finished report:

   ```
   Also noticed: src/Cases/Export/CsvWriter.cs:58 · a failed row write is swallowed and the export reports success (data loss)
   Leads dropped: knip flagged src/Cases/Dto/LegacyCaseDto.cs as unused; it is the response type of the v1 endpoint in CaseEndpoints.cs:22.
   Notes on design findings: D1 · priced · src/Cases/Jobs/RetryScheduler.cs:12-140 · 200 lines in this area, plus the 60-line RetryStore.
   Finders couldn't see: src/Cases/Gen/*.cs (marked generated in .editorconfig, but written by hand)
   Not read in full: src/Cases/Reports/PdfLayout.cs
   ```

   Done when the last line of the report starts with `Not read in full:`.

5. Save the report to the path on your brief's `Report:` line with a shell heredoc (`cat > "<path>" <<'EOF'` … `EOF`). If saving is refused, reply with the whole report instead. Otherwise reply with only the report path.
