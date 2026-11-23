## Reading modes and finding format

- **Mode `full`:** read every file whole.
- **Mode `diff`:** read `git diff -U30 HEAD -- <path>`, and the whole file when the change touches a contract or endpoint, a schema or migration, or a domain or application rule, or when you are unsure.
- **Mode `fixes`:** read `git diff -U30 HEAD -- <path>`. Everything already committed was reviewed in an earlier round.
- **Every mode:** read an untracked file whole. For a deleted file, read the deletion and search the tree for what still refers to it.

**Write one block per finding.** The heading is exactly `### F<n> <path>:<line>`, so a script can read it: `<path>` is a path from your `Files:` list, written as it is there (for a harm that shows in another file, head the finding with the listed file that causes it, and name the other file on `files`), and `<line>` is one number, never a range (use `:1` for a whole file). Then five lines:

- `problem`: what is wrong (for doctrine reviews, begin with the rule's path from its `<!-- rule: <path> -->` line, then what breaks it);
- `harm`: what goes wrong because of it, with the command or `file:line` that shows it;
- `fix`: the concrete change;
- `files`: every existing file the fix edits, the heading's path among them, each as its path from the repo root, separated by `, `, so a script can give them all to one fixer; a file the fix creates is not listed;
- `do`: one of `fix`, `park`, `ask`, or `nit`.

End with two lines: `Files read:` (each file you read, by its path from the repo root, as `path (full)` or `path (diff)`), then `TO FIX: <n>`, the count of `do: fix` blocks. `TO FIX:` is the file's last line, even when there are no findings.

Save the report to the `Report:` path with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`). Reply with the path only.
