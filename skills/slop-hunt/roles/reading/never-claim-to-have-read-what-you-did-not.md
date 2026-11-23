## Never claim to have read what you did not

**Law:** Read every file of your hunter area in full with no skimming, sampling, or reading signatures in place of bodies, list every file you could not finish in `notReadInFull`, and never claim a file you did not read (the design reader has no `notReadInFull` field and still never claims unread files).

**When:** Reading files and writing the report in a hunter or design-reader pass.

Bad: Skimming a 900-line file's method signatures and setting `notReadInFull: []` in the hunter report.
Good: Reading the file in line-range chunks until complete, or listing its repo-relative path in `notReadInFull` if room runs out.
