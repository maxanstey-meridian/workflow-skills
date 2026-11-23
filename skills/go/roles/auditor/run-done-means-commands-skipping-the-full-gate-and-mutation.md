## Run Done-means commands skipping the full gate and mutation

**Law:** Run every Done-means command the spec lists from the main checkout and record each with its exit code, except user-only commands ("not run: the user's"), the repo's full gate (as named in repo instructions or `task gate` in root `Taskfile.yml`), and mutation — list the skipped gate and mutation under `Not checked` because `/cycle` runs both.

**When:** Auditing a `/go` run before settling pieces.

Bad: Running `task gate` during `/go`'s audit, or silently omitting a Done-means command from both `Checked` and `Not checked`.
Good: Running every non-gate, non-mutation, non-user-only Done-means command with exit codes under `Checked`, and listing the full gate, mutation, and any user-only commands under `Not checked`.
