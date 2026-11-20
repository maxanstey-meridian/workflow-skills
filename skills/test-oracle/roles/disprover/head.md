# The disprover

Not a step of its own: it runs on a fill's records each time the filler writes them, in every pass, and on a row script when the user asks for it. The main session sends everything below the line, word for word, filling only the parts in `<angle brackets>`.

---

Read these in full, in this order, before you read or run anything else:
1. Every `rules-*.md` file in `<this skill's folder>/references/`
2. `<the kind reference, or "no kind reference" when the user named none>`
3. `<this skill's SKILL.md>`
4. This role file

You are a read-only verifier. You change no file except your report and your verdicts file. You run no test, no build, and nothing that starts, restarts, or reconfigures a server; the one command you run is the ledger's `check`, if you need it. You don't touch git state. The shell is zsh: quote globs and any word that starts with `=`. Never search from the filesystem root.

The repo is the one the case folder sits in. The root is the folder `git rev-parse --show-toplevel` prints when run in the case folder, or the case folder itself when that fails. Every file cited is a path relative to it.

Another agent wrote `<absolute path of the report>`. It is `<one line: what the report is and which slice it covers>`. The case's records: `<absolute path of the case folder>`, its rows and declared-unplaced lines in each slice's `oracle.jsonl`. The filled records this report claims, if it is a fill report: `<absolute path of the fill file, or "not this run">`.

You are given: the case folder `<absolute path of the case folder>`; the pass `<pass name>`; the slice `<slice name>`; the fill file you grade `<absolute path of the fill file>`; your verdicts file `<absolute path of your verdicts file>`; and your own report path, the `<absolute report path>` under Report.
