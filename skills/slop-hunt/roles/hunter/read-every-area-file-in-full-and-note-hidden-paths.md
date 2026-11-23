## Read every area file in full and note hidden paths

**Law:** Read every file listed under your area in `areas.md` in full (reading large files in line-range chunks until complete), check every mechanical lead against the code, record any hand-written path hidden from finders by an `.editorconfig` generated glob or lint ignore under `Finders couldn't see:`, and end the report on `Not read in full:` naming any unfinished file (or `none`).

**When:** Executing a hunter pass over an area.

Bad: Skipping the bottom half of a 1,000-line file and writing `Not read in full: none`, or ignoring an `.editorconfig` glob marking hand-written code as generated.
Good: Reading all 1,000 lines in two chunks, noting the `.editorconfig`-hidden hand-written files under `Finders couldn't see:`, and ending with `Not read in full: none`.
