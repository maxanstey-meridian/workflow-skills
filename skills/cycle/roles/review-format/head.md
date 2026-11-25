## Reading modes and finding format

- **Mode `full`:** read every file whole.
- **Mode `diff`:** read `git diff -U30 HEAD -- <path>`, and the whole file when the change touches a contract or endpoint, a schema or migration, or a domain or application rule, or when you are unsure.
- **Mode `fixes`:** read `git diff -U30 HEAD -- <path>`. Everything already committed was reviewed in an earlier round.
- **Every mode:** read an untracked file whole. For a deleted file, read the deletion and search the tree for what still refers to it.

**Write strict YAML matching the schema below** to your `Report:` path (`.yaml`) with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`). Set `findings: []` when there are no findings. Each finding in `findings` has:

- `id`: `F1`, `F2`, and so on;
- `file`: a path from your `Files:` list, written as it is there (for a harm that shows in another file, name the listed file that causes it here and include the other file in `files`);
- `line`: one positive integer, never a range (use `1` for a whole file);
- `rule`: optional — for doctrine reviews, set this to the rule's path from its `<!-- rule: <path> -->` line;
- `problem`: what is wrong;
- `harm`: what goes wrong because of it, with the command or `file:line` that shows it;
- `fix`: the concrete change;
- `files`: list of every existing file the fix edits, `file` among them, each relative to the repo root, so `cycle-ctl.mjs` can give them all to one fixer; a file the fix creates is not listed;
- `do`: one of `fix`, `park`, `ask`, or `nit`.

Include `filesRead` with every file you read (`path` relative to the repo root and `mode`: `full` or `diff`).

Report schema:

<!-- schema: ReviewReportSchema -->

**Validate your report** before replying (`<skill>` is the folder above the `references/` folder this file lives in):

```sh
node <skill>/scripts/cycle-ctl.mjs validate review "<report>"
```

Fix any YAML or schema error until the command exits `0`, then reply with only the report path.
