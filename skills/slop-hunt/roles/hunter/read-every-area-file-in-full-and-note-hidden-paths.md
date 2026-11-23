## Read every area file in full and note hidden paths

**Law:** Read every file listed under your area in `areas.yaml` in full (reading large files in line-range chunks until complete), check every mechanical lead against the code, record any hand-written path hidden from finders by an `.editorconfig` generated glob or lint ignore under `findersCouldntSee`, and list every unfinished file in `notReadInFull` (or `[]` when all were read in full).

**When:** Executing a hunter pass over an area.

Bad: Skipping the bottom half of a 1,000-line file and writing `notReadInFull: []`, or ignoring an `.editorconfig` glob marking hand-written code as generated.
Good: Reading all 1,000 lines in two chunks, noting the `.editorconfig`-hidden hand-written files under `findersCouldntSee`, and setting `notReadInFull: []`.
