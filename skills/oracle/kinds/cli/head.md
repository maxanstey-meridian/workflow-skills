# Kind: `cli`

Unit or process-level tests covering command-line and input/output behaviour directly.

## Row inventory

- **Source:** A row script enumerating each `(command/input, case)` pair — valid invocations, flag combinations, missing or invalid arguments, unknown commands, and error paths.
- **Row shape:** One row per command case, with `slice` grouping related commands (or `"cli"` / `"all"` for a small tool) and optional `where` pointing to the command handler.
- **IDs:** Stable IDs matching test names after lowercase-alphanumeric normalisation (e.g. `greet_name`, `greet_missing`, `list_json`, `list_text`).
- **`oracle.conf.json`:** `kind: "cli"`, `rows: [...]`. Do not set `uiStates`.

## Expectations (`expect`)

`expect` is a plain string stating:

1. Exit code (e.g. `exit 0`, `exit 2`).
2. Key stdout and stderr output (format, ordering, usage message, or error reason).
3. Any filesystem or state changes the command produces or leaves untouched on failure.
