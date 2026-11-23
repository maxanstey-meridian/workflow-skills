# Hunter

Your brief gave you a hunt folder, your area's name (`Yours:`), and a report path (`<hunt folder>/report-<area>.yaml`). `<skill>` is the folder above the `references/` folder this file lives in. You read one area of the repository in full, find the weight it hasn't earned, and argue each finding as "How to read" above says. You change nothing but your report.

1. Read "How to read", "Slop and its signs", "The hunters' report", and "The house shape and the capability map" above, the house Laws and rules (see Rules, at the top of this file), and the repo's instructions. Then read, in the hunt folder:
   - `areas.yaml`: its `root:` field is the repository, and your files are the `files:` list of the entry in `areas:` whose `name:` matches your `Yours:` line;
   - `sizes.txt`, and every `leads-*.txt` (the output of the mechanical finders: leads, never findings; a file that says `skipped:` names a finder that couldn't run);
   - `report-design.yaml`, if it exists. Its findings that touch your area you confirm, price more exactly, or contradict with what you read, rather than report again.

2. Open your report's frame.
   - If `areas.yaml` has only one base area (only one entry in `areas:` whose `name` does not end with `-rest`), you are the only hunter and there is no design reader, so your report includes `houseShape` and a `weightMap` over every capability in the repo, both as "The house shape and the capability map" above describes.
   - If `areas.yaml` has more than one base area, omit `houseShape` and keep `weightMap` to your area only. If your area is `cross-cutting`, you also look for copies between the other areas: a per-area hunter couldn't see them.

3. Weigh each piece of your area first (see "Weigh before you read lines" above), then read every file in full from the entry points down and check every lead against the code, following the hunter rules below.

4. Write the report as strict YAML matching `HunterReportSchema` (see "The hunters' report" above), with your frame from step 2 on top, followed by `findings` (`#1`, `#2`, ...), `cleanup`, `alsoNoticed`, `leadsDropped`, and these three hunter fields (each `[]` when empty):
   - `notesOnDesign`: entries `{ findingId, stance, where, note }` for findings in `report-design.yaml` (`stance` is `"confirmed"`, `"priced"`, or `"contradicted"`);
   - `findersCouldntSee`: entries `{ path, why }` for hand-written paths a config hides from the finders (step 3);
   - `notReadInFull`: required array of repo-relative paths of files in your area you did not read in full, or `[]` when every file was read in full.

   Use `|-` for multi-line values, never `>` or `>-`. Here is an example of a finished `report-<area>.yaml`:

   ```yaml
   weightMap:
     - capability: Notification retries
       files: src/Cases/Jobs/
       lines: 260
       sharePct: 4
       status: finding
       findingId: D1
   findings: []
   cleanup: []
   alsoNoticed:
     - where: src/Cases/Export/CsvWriter.cs:58
       what: a failed row write is swallowed and the export reports success
       tag: data-loss
   leadsDropped:
     - lead: knip flagged src/Cases/Dto/LegacyCaseDto.cs as unused
       why: it is the response type of the v1 endpoint in CaseEndpoints.cs:22
   notesOnDesign:
     - findingId: D1
       stance: priced
       where: src/Cases/Jobs/RetryScheduler.cs:12-140
       note: 200 lines in this area, plus the 60-line RetryStore.
   findersCouldntSee:
     - path: src/Cases/Gen/*.cs
       why: marked generated in .editorconfig, but written by hand
   notReadInFull:
     - src/Cases/Reports/PdfLayout.cs
   ```

5. Save the report to the path on your brief's `Report:` line with a shell heredoc (`cat > "<path>" <<'EOF'` … `EOF`).

6. Validate your report before replying (add `--single-area` when `areas.yaml` has only one base area and your area does not end with `-rest`):

   ```sh
   node <skill>/scripts/slop-ctl.mjs validate hunter "<report>" [--single-area]
   ```

   Fix any YAML or schema error until the command exits `0`.

7. Reply with only the report path.
