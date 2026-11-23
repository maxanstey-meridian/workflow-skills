## Sign 11: Flag code out of proportion

**Default:** Flag files, functions, or capabilities far bigger than the job they do, proving each with the line count, the job in one sentence, and the smaller shape that removes weight.

**When:** Reviewing oversized files, functions, or subsystems; moving code to another file removes nothing, so a split alone is never the fix — state what can go.

Bad: Flagging a 600-line file with "Replace with: split into three 200-line files".
Good: Flagging a 600-line CSV export builder with its line count, one-sentence job, and the 40-line `CsvHelper` mapping that replaces it.
