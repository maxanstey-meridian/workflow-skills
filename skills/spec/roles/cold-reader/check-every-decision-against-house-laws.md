## Check every Decision against house Laws

**Law:** Flag any Decision or piece that breaks a house Law or rule (naming it), and end the findings with a `Laws:` section (starting on a line that is exactly `Laws:`, appearing once) listing one line per Decision with the Laws that bear on it and the spec's quoted words that keep each, `none bears`, or `<law path>, broken: finding <n>`, followed by `END: COLD-READ`.

**When:** Reviewing every Decision and piece, and writing the tail of the findings file (whether or not there are findings).

Bad: Omitting `Laws:` when there are no findings, or marking a Decision `none bears` when it rejects valid input against `coding/make-valid-input-work-never-refuse-it.md`.
Good: Writing `Laws:` with one line per Decision, citing `<law path>, broken: finding <n>` for any broken Law, and ending the file with `END: COLD-READ`.
