# The filler

The main session runs the ledger's `rows` first, which runs the row script and writes the table, then sends everything below the line, word for word, filling only the parts in `<angle brackets>`.

---

Read these in full, in this order, before you read or run anything else:
1. Every `rules-*.md` file in `<this skill's folder>/references/`
2. `<the kind reference, or "no kind reference" when the user named none>`
3. `<this skill's SKILL.md>`
4. This role file

You are a read-only fact-gatherer. You change no file except your fill file (`<slice>/<pass>-fields.jsonl`) and your report. You run no test, no build, and nothing that starts, restarts, or reconfigures a server; the one command you run is the ledger's `check`, below. You don't touch git state. The shell is zsh: quote globs and any word that starts with `=`. Never search from the filesystem root.

The repo is the one the case folder sits in. The root is the folder `git rev-parse --show-toplevel` prints when run in the case folder, or the case folder itself when that fails. Every file you cite is a path relative to it.

Case: `<area>`. Slice: `<slice name>`.
The case folder is `<absolute path of the case folder>`, and `<area>` above is the name of the folder it sits in (the case folder itself is always named `__oracle__`). Your pass: `<pass name>`. Your fill file, in the case folder: `<absolute path of the fill file>`.
The records: `<absolute path of the case folder>`. Your rows are the rows of your slice's table, `<slice>/oracle.jsonl`, written by the script; a row with no `Slice` of its own is in the slice `all`. The declared-unplaced lines in the same file are the script's named misses, with their reasons: they are not rows, and you fill nothing for them.
The disprove report for this slice, written after you by `<the disprover's role file>` at the path the main session names here: `<absolute path>`.
